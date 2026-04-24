package com.laptopai.chat_backend.chat;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;

@Service
public class ClaudeService {

    private static final Logger log = LoggerFactory.getLogger(ClaudeService.class);

    // Anthropic Messages API endpoint
    private static final URI MESSAGES_URI = URI.create("https://api.anthropic.com/v1/messages");

    /**
     * IMPORTANT:
     * - Model default below is a real Claude API alias (recommended to override in application.properties anyway).
     * - Claude Messages API roles must alternate between user/assistant (system is top-level).
     */
    private static final String DEFAULT_MODEL = "claude-sonnet-4-5"; // valid alias per Claude API models overview
    private static final String DEFAULT_VERSION = "2023-06-01";

    private static final String DEFAULT_SYSTEM_PROMPT = """
You are TechBuddy, a human-like laptop requirements interviewer.

GOAL
- Have a natural conversation to understand the user deeply before scoring.
- Ask focused follow-up questions about real workload details.
- Infer only preference weights (CPU, GPU, RAM, Battery), not laptop model recommendations.

CONVERSATION STYLE
- Sound warm, conversational, and specific to what the user already said.
- Ask 1-2 short follow-up questions per turn when critical details are missing.
- Prioritize discovering:
  1) primary work/study use
  2) exact software/apps and how heavy they are
  3) multitasking level and background apps
  4) portability vs mostly-on-desk usage
  5) budget and region/currency
- Reflect the user's context in plain language, not robotic checklists.

OUTPUT CONTRACT (STRICT)
Return ONLY valid JSON. No markdown. No extra text.

Use this exact schema:
{
  "assistantMessage": string,
  "collectorScores": {
    "maxPrice": number|null,
    "cpuWeight": number|null,
    "gpuWeight": number|null,
    "ramWeight": number|null,
    "batteryWeight": number|null
  },
  "nextQuestion": string|null,
  "readyForWeights": boolean,
  "state": {
    "missingCritical": [string]
  }
}

SCORING RULES
- Weights must be integers from 0 to 10 when provided.
- If readyForWeights=false, set all four weight fields to null.
- Set readyForWeights=true only after you know:
  - main workload type, and
  - software or task intensity, and
  - portability/battery preference.
- maxPrice is the user's maximum budget when known, otherwise null.
- assistantMessage should be short, natural, and human (1-3 sentences).
- nextQuestion should be null only when readyForWeights=true and no key question remains.
""".trim();

    private final HttpClient httpClient;
    private final ObjectMapper mapper;

    private final boolean enabled;
    private final String apiKey;
    private final String model;
    private final String apiVersion;
    private final int maxTokens;
    private final double temperature;
    private final String systemPrompt;

    public ClaudeService(
            @Value("${anthropic.api.enabled:true}") boolean enabled,
            @Value("${anthropic.api.key:}") String apiKey,
            @Value("${anthropic.api.model:" + DEFAULT_MODEL + "}") String model,
            @Value("${anthropic.api.version:" + DEFAULT_VERSION + "}") String apiVersion,
            @Value("${anthropic.api.max-tokens:350}") int maxTokens,
            @Value("${anthropic.api.temperature:0.2}") double temperature,
            @Value("${anthropic.api.system-prompt:}") String systemPromptOverride
    ) {
        this.enabled = enabled;
        this.apiKey = apiKey == null ? "" : apiKey.trim();
        this.model = model == null ? "" : model.trim();
        this.apiVersion = apiVersion == null ? "" : apiVersion.trim();
        this.maxTokens = maxTokens;
        this.temperature = temperature;

        this.systemPrompt = (systemPromptOverride == null || systemPromptOverride.isBlank())
                ? DEFAULT_SYSTEM_PROMPT
                : systemPromptOverride.trim();

        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(15))
                .build();

        this.mapper = new ObjectMapper();
    }

    public boolean isEnabled() {
        return enabled && !apiKey.isBlank() && !model.isBlank() && !apiVersion.isBlank();
    }

    /**
     * Calls Claude and returns the parsed JSON object that the model is instructed to output.
     * If the model returns extra text (should not), we attempt to slice the first JSON object.
     */
    public JsonNode generateStructuredResponse(List<ClaudeMessage> inputMessages) {
        if (!isEnabled()) {
            log.warn("ClaudeService disabled or missing config (apiKey/model/version).");
            return null;
        }
        if (inputMessages == null || inputMessages.isEmpty()) {
            return null;
        }

        // Enforce: only "user" and "assistant", and alternating roles.
        List<ClaudeMessage> cleaned = normalizeMessages(inputMessages);
        if (cleaned.isEmpty()) return null;

        try {
            ObjectNode requestBody = mapper.createObjectNode();
            requestBody.put("model", model);
            requestBody.put("max_tokens", Math.max(1, maxTokens));
            requestBody.put("temperature", temperature);
            requestBody.put("system", systemPrompt);

            ArrayNode messagesNode = requestBody.putArray("messages");
            for (ClaudeMessage m : cleaned) {
                ObjectNode node = messagesNode.addObject();
                node.put("role", m.role());
                node.put("content", m.content());
            }

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(MESSAGES_URI)
                    .header("x-api-key", apiKey)
                    .header("anthropic-version", apiVersion)
                    .header("content-type", "application/json")
                    .timeout(Duration.ofSeconds(60))
                    .POST(HttpRequest.BodyPublishers.ofString(requestBody.toString()))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                // Keep body because Anthropic returns helpful JSON errors
                log.warn("Claude API error: status={} body={}", response.statusCode(), response.body());
                return null;
            }

            String text = extractAssistantText(response.body());
            if (text == null || text.isBlank()) {
                log.warn("Claude returned empty content.");
                return null;
            }

            JsonNode parsed = parsePossiblyWrappedJson(text);
            if (parsed == null) {
                log.warn("Claude response was not valid JSON. Raw text={}", text);
                return mapper.getNodeFactory().textNode(text);
            }
            return parsed;

        } catch (Exception e) {
            log.warn("Claude API call failed: {}", e.toString());
            return null;
        }
    }

    /**
     * Normalize messages:
     * - drop blanks
     * - allow only roles: user, assistant
     * - merge consecutive same-role messages (prevents 400 "roles must alternate")
     * - ensure first message is user
     */
    private List<ClaudeMessage> normalizeMessages(List<ClaudeMessage> input) {
        List<ClaudeMessage> filtered = new ArrayList<>();
        for (ClaudeMessage m : input) {
            if (m == null) continue;
            String role = safeLower(m.role());
            String content = m.content() == null ? "" : m.content().trim();
            if (content.isBlank()) continue;

            if (!role.equals("user") && !role.equals("assistant")) {
                // ignore invalid roles; system should be provided via top-level "system"
                continue;
            }
            filtered.add(new ClaudeMessage(role, content));
        }

        if (filtered.isEmpty()) return List.of();

        // ensure starts with user
        if (!filtered.get(0).role().equals("user")) {
            // drop leading assistant messages
            int idx = 0;
            while (idx < filtered.size() && filtered.get(idx).role().equals("assistant")) idx++;
            if (idx >= filtered.size()) return List.of();
            filtered = filtered.subList(idx, filtered.size());
        }

        // merge consecutive same role
        List<ClaudeMessage> merged = new ArrayList<>();
        ClaudeMessage prev = null;
        for (ClaudeMessage cur : filtered) {
            if (prev == null) {
                prev = cur;
                continue;
            }
            if (prev.role().equals(cur.role())) {
                prev = new ClaudeMessage(prev.role(), prev.content() + "\n\n" + cur.content());
            } else {
                merged.add(prev);
                prev = cur;
            }
        }
        if (prev != null) merged.add(prev);

        return merged;
    }

    private String safeLower(String s) {
        return s == null ? "" : s.trim().toLowerCase();
    }

    /**
     * Anthropic Messages API returns "content": [ { "type":"text", "text":"..." }, ... ]
     */
    private String extractAssistantText(String responseBody) {
        try {
            JsonNode root = mapper.readTree(responseBody);
            JsonNode content = root.path("content");
            if (!content.isArray()) return null;

            StringBuilder sb = new StringBuilder();
            for (JsonNode block : content) {
                String type = block.path("type").asText("");
                if ("text".equalsIgnoreCase(type)) {
                    sb.append(block.path("text").asText(""));
                }
            }
            String out = sb.toString().trim();
            return out.isBlank() ? null : out;
        } catch (Exception e) {
            log.warn("Failed to parse Claude response JSON: {}", e.toString());
            return null;
        }
    }

    private JsonNode parsePossiblyWrappedJson(String text) {
        String candidate = stripMarkdownCodeFence(text);

        // First try: pure JSON
        try {
            return mapper.readTree(candidate);
        } catch (Exception ignored) { }

        // Fallback: slice first JSON object from the text
        String sliced = sliceFirstJsonObject(candidate);
        if (sliced == null) return null;

        try {
            return mapper.readTree(sliced);
        } catch (Exception ignored) {
            return null;
        }
    }

    private String stripMarkdownCodeFence(String text) {
        if (text == null) return null;
        String trimmed = text.trim();
        if (!trimmed.startsWith("```")) {
            return trimmed;
        }

        int firstNewline = trimmed.indexOf('\n');
        int lastFence = trimmed.lastIndexOf("```");
        if (firstNewline < 0 || lastFence <= firstNewline) {
            return trimmed;
        }

        String inner = trimmed.substring(firstNewline + 1, lastFence).trim();
        return inner.isBlank() ? trimmed : inner;
    }

    private String sliceFirstJsonObject(String s) {
        if (s == null) return null;
        int start = s.indexOf('{');
        if (start < 0) return null;

        int depth = 0;
        for (int i = start; i < s.length(); i++) {
            char c = s.charAt(i);
            if (c == '{') depth++;
            else if (c == '}') depth--;
            if (depth == 0) return s.substring(start, i + 1);
        }
        return null;
    }

    public record ClaudeMessage(String role, String content) {}
}

