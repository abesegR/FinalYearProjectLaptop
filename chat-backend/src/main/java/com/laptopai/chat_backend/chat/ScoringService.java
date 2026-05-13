package com.laptopai.chat_backend.chat;

import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.stereotype.Service;
import java.util.*;

@Service
public class ScoringService {

    private final LaptopLkRepository repo;
    private final SentimentClient sentimentClient;

    public ScoringService(LaptopLkRepository repo, SentimentClient sentimentClient) {
        this.repo = repo;
        this.sentimentClient = sentimentClient;
    }

    public List<Map<String, Object>> getTopLaptops(CollectorScores scores, int topN) {
        Double maxPrice = scores.maxPrice() != null ? scores.maxPrice().doubleValue() : null;

        // LKR conversion — if budget given in USD (from Claude), convert to LKR (approx 320 LKR per USD)
        Double maxPriceLkr = null;
        if (maxPrice != null) {
            if (maxPrice < 5000) {
                // Looks like USD — convert
                maxPriceLkr = maxPrice * 320.0;
            } else {
                // Already LKR range
                maxPriceLkr = maxPrice;
            }
        }

        List<LaptopLk> candidates = (maxPriceLkr == null)
                ? repo.findAll()
                : repo.findByMaxPrice(maxPriceLkr);

        if (candidates.isEmpty()) {
            // Fallback: fetch all if budget filter returns nothing
            candidates = repo.findAll();
        }

        if (candidates.isEmpty()) return List.of();

        // Normalise across full candidate set
        double maxRam    = candidates.stream().mapToInt(l -> l.getRam()     != null ? l.getRam()     : 0).max().orElse(1);
        double maxPrice2 = candidates.stream().mapToDouble(l -> l.getPriceLkr() != null ? l.getPriceLkr() : 0).max().orElse(1);

        // Group by normalised name — same laptop from multiple sites
        // Key = brand + cpu + ram + storage (normalised)
        Map<String, List<LaptopLk>> grouped = new LinkedHashMap<>();
        for (LaptopLk l : candidates) {
            String key = buildGroupKey(l);
            grouped.computeIfAbsent(key, k -> new ArrayList<>()).add(l);
        }

        // Score each group (use best specs from group)
        List<Map<String, Object>> results = new ArrayList<>();

        for (Map.Entry<String, List<LaptopLk>> entry : grouped.entrySet()) {
            List<LaptopLk> group = entry.getValue();
            LaptopLk rep = group.get(0); // representative laptop

            double cpuScore     = scoreCpu(rep.getCpu());
            double gpuScore     = scoreGpu(rep.getGpu());
            double ramScore     = rep.getRam()    != null ? rep.getRam()    / maxRam    : 0;
            double batteryScore = rep.getScreen() != null && rep.getScreen() <= 14.0 ? 1.0 : 0.4;
            double priceScore   = rep.getPriceLkr() != null ? 1.0 - (rep.getPriceLkr() / maxPrice2) : 0;

            int cw = def(scores.cpuWeight());
            int gw = def(scores.gpuWeight());
            int rw = def(scores.ramWeight());
            int bw = def(scores.batteryWeight());
            int totalWeight = cw + gw + rw + bw + 2;

            double baseScore = (cw * cpuScore + gw * gpuScore + rw * ramScore + bw * batteryScore + 2 * priceScore) / totalWeight;

            // Build "where to buy" list from all sites in group
            List<Map<String, Object>> whereToBuy = new ArrayList<>();
            for (LaptopLk site : group) {
                Map<String, Object> siteEntry = new LinkedHashMap<>();
                siteEntry.put("site", site.getSourceSite());
                siteEntry.put("priceLkr", site.getPriceLkr());
                siteEntry.put("availability", site.getAvailability());
                siteEntry.put("url", site.getProductUrl());
                siteEntry.put("inStock", "in stock".equalsIgnoreCase(site.getAvailability()));
                whereToBuy.add(siteEntry);
            }

            // Sort where to buy — in stock first, then by price
            whereToBuy.sort((a, b) -> {
                boolean aStock = (boolean) a.get("inStock");
                boolean bStock = (boolean) b.get("inStock");
                if (aStock != bStock) return aStock ? -1 : 1;
                Double ap = (Double) a.get("priceLkr");
                Double bp = (Double) b.get("priceLkr");
                if (ap == null) return 1;
                if (bp == null) return -1;
                return Double.compare(ap, bp);
            });

            // Best price across sites
            double bestPrice = group.stream()
                    .filter(l -> l.getPriceLkr() != null)
                    .mapToDouble(LaptopLk::getPriceLkr)
                    .min().orElse(0);

            boolean anyInStock = group.stream()
                    .anyMatch(l -> "in stock".equalsIgnoreCase(l.getAvailability()));

            Map<String, Object> entry2 = new LinkedHashMap<>();
            entry2.put("name",       rep.getName());
            entry2.put("brand",      rep.getBrand());
            entry2.put("cpu",        rep.getCpu());
            entry2.put("ram",        rep.getRam());
            entry2.put("storage",    rep.getStorage());
            entry2.put("gpu",        rep.getGpu());
            entry2.put("screen",     rep.getScreen());
            entry2.put("bestPriceLkr", bestPrice);
            entry2.put("anyInStock", anyInStock);
            entry2.put("whereToBuy", whereToBuy);
            entry2.put("score",      Math.round(baseScore * 100.0) / 100.0);
            results.add(entry2);
        }

        // Sort by score
        results.sort((a, b) -> Double.compare((double) b.get("score"), (double) a.get("score")));
        List<Map<String, Object>> top = new ArrayList<>(results.subList(0, Math.min(topN, results.size())));

        // Sentiment enrichment for top N only
        for (Map<String, Object> laptop : top) {
            String name  = (String) laptop.get("name");
            String brand = (String) laptop.get("brand");
            JsonNode sentiment = sentimentClient.getSentiment(name, brand);
            if (sentiment != null) {
                double base     = (double) laptop.get("score");
                double modifier = sentiment.path("score_modifier").asDouble(1.0);
                double adjusted = Math.min(1.0, base * modifier);
                laptop.put("score",     Math.round(adjusted * 100.0) / 100.0);
                laptop.put("sentiment", buildSentimentMap(sentiment));
            }
        }

        top.sort((a, b) -> Double.compare((double) b.get("score"), (double) a.get("score")));
        return top;
    }

    /**
     * Build a grouping key to match same laptop across sites.
     * Uses brand + cpu + ram + storage — ignores site-specific name differences.
     */
    private String buildGroupKey(LaptopLk l) {
        String brand   = l.getBrand()   != null ? l.getBrand().toLowerCase().trim()   : "unknown";
        String cpu     = l.getCpu()     != null ? l.getCpu().toLowerCase().trim()     : "unknown";
        String ram     = l.getRam()     != null ? l.getRam().toString()               : "0";
        String storage = l.getStorage() != null ? l.getStorage().toString()           : "0";
        String gpu     = l.getGpu()     != null ? l.getGpu().toLowerCase().trim()     : "integrated";

        // Also use first 30 chars of name for disambiguation
        String cleanName = l.getName() != null
        ? l.getName().toLowerCase().replaceAll("[^a-z0-9]", "")
        : "";
String nameKey = cleanName.substring(0, Math.min(30, cleanName.length()));

        return brand + "|" + cpu + "|" + ram + "|" + storage + "|" + gpu + "|" + nameKey;
    }

    private Map<String, Object> buildSentimentMap(JsonNode sentiment) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("overall", Math.round(sentiment.path("overall_sentiment").asDouble(0) * 100.0) / 100.0);
        map.put("sources", nodeToList(sentiment.path("review_sources")));
        Map<String, Object> aspects = new LinkedHashMap<>();
        for (String aspect : new String[]{"performance","battery","thermals","value","build_quality"}) {
            JsonNode a = sentiment.path("aspects").path(aspect);
            if (!a.isMissingNode()) {
                Map<String, Object> am = new LinkedHashMap<>();
                am.put("score",   Math.round(a.path("score").asDouble(0) * 100.0) / 100.0);
                am.put("label",   a.path("label").asText("Mixed"));
                am.put("snippet", a.path("snippet").asText(""));
                aspects.put(aspect, am);
            }
        }
        map.put("aspects", aspects);
        return map;
    }

    private List<String> nodeToList(JsonNode node) {
        List<String> list = new ArrayList<>();
        if (node.isArray()) for (JsonNode item : node) list.add(item.asText());
        return list;
    }

    private double scoreCpu(String cpu) {
        if (cpu == null) return 0.3;
        String c = cpu.toLowerCase();
        if (c.contains("ultra 9") || c.contains("i9") || c.contains("ryzen 9")) return 1.0;
        if (c.contains("ultra 7") || c.contains("i7") || c.contains("ryzen 7")) return 0.8;
        if (c.contains("ultra 5") || c.contains("i5") || c.contains("ryzen 5") || c.contains("core 7")) return 0.6;
        if (c.contains("i3") || c.contains("ryzen 3") || c.contains("core 5")) return 0.4;
        if (c.contains("m3 max") || c.contains("m3 pro")) return 1.0;
        if (c.contains("m3") || c.contains("m2 pro")) return 0.9;
        if (c.contains("m2") || c.contains("m1")) return 0.8;
        return 0.3;
    }

    private double scoreGpu(String gpu) {
        if (gpu == null || gpu.isBlank()) return 0.1;
        String g = gpu.toLowerCase();
        if (g.contains("rtx 50")) return 1.0;
        if (g.contains("rtx 40")) return 0.95;
        if (g.contains("rtx 30") || g.contains("rx 7")) return 0.8;
        if (g.contains("rtx 20") || g.contains("rx 6")) return 0.6;
        if (g.contains("gtx") || g.contains("mx")) return 0.4;
        if (g.contains("arc") || g.contains("intel")) return 0.35;
        return 0.2;
    }

    private int def(Integer v) { return v != null ? v : 1; }
}
