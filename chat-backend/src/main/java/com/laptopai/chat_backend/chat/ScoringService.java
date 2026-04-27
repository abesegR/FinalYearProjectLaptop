package com.laptopai.chat_backend.chat;

import org.springframework.stereotype.Service;
import java.util.*;

@Service
public class ScoringService {

    private final LaptopRepository repo;

    public ScoringService(LaptopRepository repo) {
        this.repo = repo;
    }

    public List<Map<String, Object>> getTopLaptops(CollectorScores scores, int topN) {
        try {
            Double maxPrice = scores.maxPrice() != null ? scores.maxPrice().doubleValue() : null;

            // If maxPrice > 5000, assume non-USD currency, fetch all
            List<Laptop> candidates = (maxPrice == null || maxPrice > 5000)
                    ? repo.findAll()
                    : repo.findByMaxPrice(maxPrice);

            if (candidates.isEmpty()) {
                return List.of();
            }

            double maxRam = candidates.stream().mapToInt(l -> l.getRam() != null ? l.getRam() : 0).max().orElse(1);
            double maxPrice2 = candidates.stream().mapToDouble(l -> l.getPrice() != null ? l.getPrice() : 0).max().orElse(1);

            List<Map<String, Object>> results = new ArrayList<>();

            for (Laptop l : candidates) {
                double cpuScore = scoreCpu(l.getCpu());
                double gpuScore = scoreGpu(l.getGpu());
                double ramScore = l.getRam() != null ? l.getRam() / maxRam : 0;
                double batteryScore = l.getScreen() != null && l.getScreen() <= 14.0 ? 1.0 : 0.4;
                double priceScore = l.getPrice() != null ? 1.0 - (l.getPrice() / maxPrice2) : 0;

                int cw = def(scores.cpuWeight());
                int gw = def(scores.gpuWeight());
                int rw = def(scores.ramWeight());
                int bw = def(scores.batteryWeight());
                int totalWeight = cw + gw + rw + bw + 2;

                double total = (cw * cpuScore + gw * gpuScore + rw * ramScore + bw * batteryScore + 2 * priceScore) / totalWeight;

                Map<String, Object> entry = new LinkedHashMap<>();
                entry.put("name", l.getName());
                entry.put("brand", l.getBrand());
                entry.put("cpu", l.getCpu());
                entry.put("ram", l.getRam());
                entry.put("storage", l.getStorage());
                entry.put("gpu", l.getGpu());
                entry.put("screen", l.getScreen());
                entry.put("price", l.getPrice());
                entry.put("score", Math.round(total * 100.0) / 100.0);
                results.add(entry);
            }

            results.sort((a, b) -> Double.compare((double) b.get("score"), (double) a.get("score")));
            return results.subList(0, Math.min(topN, results.size()));
        } catch (RuntimeException ex) {
            return List.of();
        }
    }

    private double scoreCpu(String cpu) {
        if (cpu == null) return 0.3;
        String c = cpu.toLowerCase();
        if (c.contains("i9") || c.contains("ryzen 9")) return 1.0;
        if (c.contains("i7") || c.contains("ryzen 7")) return 0.8;
        if (c.contains("i5") || c.contains("ryzen 5")) return 0.6;
        if (c.contains("i3") || c.contains("ryzen 3")) return 0.4;
        return 0.3;
    }

    private double scoreGpu(String gpu) {
        if (gpu == null || gpu.isBlank()) return 0.1;
        String g = gpu.toLowerCase();
        if (g.contains("rtx 40") || g.contains("rx 7")) return 1.0;
        if (g.contains("rtx 30") || g.contains("rx 6")) return 0.8;
        if (g.contains("rtx 20") || g.contains("rx 5")) return 0.6;
        if (g.contains("gtx") || g.contains("mx")) return 0.4;
        return 0.2;
    }

    private int def(Integer v) { return v != null ? v : 1; }
}
