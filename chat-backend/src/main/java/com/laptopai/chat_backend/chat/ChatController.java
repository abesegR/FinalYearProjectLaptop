package com.laptopai.chat_backend.chat;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@RestController
@RequestMapping("/chat")
@CrossOrigin(originPatterns = {"http://localhost:*", "http://127.0.0.1:*"})
public class ChatController {
    private static final String OPENING_USER_PROMPT = "Start a new laptop-needs conversation. Be friendly and ask one concise question about the user's primary work and which software they use most. Do not provide weights yet.";

    private final ClaudeService claudeService;
    private final ObjectMapper mapper = new ObjectMapper();
    private final Map<String, ConversationContext> conversationHistory = new ConcurrentHashMap<>();

    public ChatController(ClaudeService claudeService) {
        this.claudeService = claudeService;
    }

    @PostMapping
    public JsonNode chat(@RequestBody ChatRequest request) {
        String sessionId = normalizeSessionId(request == null ? null : request.getSessionId());
        String userMsg = (request == null || request.getMessage() == null) ? "" : request.getMessage().trim();

        ConversationContext context = conversationHistory.computeIfAbsent(sessionId, id -> new ConversationContext());
        boolean isKickoffTurn = context.isEmpty() && userMsg.isBlank();
        List<ClaudeService.ClaudeMessage> modelMessages;

        if (isKickoffTurn) {
            context.addUser(OPENING_USER_PROMPT);
            modelMessages = context.getMessages();
        } else {
            context.addUser(userMsg);
            modelMessages = context.getMessages();
        }

        JsonNode rawResponse = claudeService.generateStructuredResponse(modelMessages);
        JsonNode response = normalizeResponse(rawResponse);

        String assistant = extractAssistantMessage(response);
        if (assistant != null && !assistant.isBlank()) {
            context.addAssistant(assistant);
        }

        JsonNode finalResponse = withLegacyFields(response, assistant);
        if (isKickoffTurn && finalResponse instanceof ObjectNode objectNode) {
            clearWeightFields(objectNode.with("collectorScores"));
        }
        return finalResponse;
    }

    private String normalizeSessionId(String raw) {
        if (raw == null || raw.isBlank()) return "default";
        return raw.trim();
    }

    private JsonNode normalizeResponse(JsonNode rawResponse) {
        if (rawResponse == null || rawResponse.isNull()) {
            return buildFallbackResponse("Sorry, I had trouble reaching the assistant just now. Could you try again?");
        }
        if (rawResponse.isObject()) {
            return rawResponse;
        }

        String textResponse = normalizeText(rawResponse);
        if (textResponse != null) {
            JsonNode recovered = recoverResponseFromText(textResponse);
            if (recovered != null) {
                return recovered;
            }
        }
        return buildFallbackResponse("Sorry, I had trouble reaching the assistant just now. Could you try again?");
    }

    private JsonNode recoverResponseFromText(String rawText) {
        String candidate = stripMarkdownCodeFence(rawText);
        JsonNode parsed = tryParseJsonObject(candidate);
        if (parsed != null) {
            return parsed;
        }

        String assistant = extractJsonStringField(candidate, "assistantMessage");
        if (assistant == null) {
            assistant = extractJsonStringField(candidate, "reply");
        }
        if (assistant == null) {
            assistant = extractFirstSentence(candidate);
        }
        if (assistant == null || assistant.isBlank()) {
            return null;
        }

        JsonNode fallback = buildFallbackResponse(assistant);
        if (fallback instanceof ObjectNode objectNode) {
            objectNode.set("collectorScores", buildCollectorScoresFromText(candidate));
            return objectNode;
        }
        return null;
    }

    private JsonNode tryParseJsonObject(String text) {
        if (text == null || text.isBlank()) {
            return null;
        }
        try {
            JsonNode node = mapper.readTree(text);
            return node.isObject() ? node : null;
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

    private String extractJsonStringField(String text, String field) {
        if (text == null || field == null || field.isBlank()) {
            return null;
        }

        Pattern pattern = Pattern.compile("\"" + Pattern.quote(field) + "\"\\s*:\\s*\"((?:\\\\.|[^\"\\\\])*)\"", Pattern.DOTALL);
        Matcher matcher = pattern.matcher(text);
        if (!matcher.find()) {
            return null;
        }

        String value = matcher.group(1);
        if (value == null) return null;
        String decoded = value
                .replace("\\n", "\n")
                .replace("\\t", "\t")
                .replace("\\\"", "\"")
                .replace("\\\\", "\\")
                .trim();
        return decoded.isEmpty() ? null : decoded;
    }

    private Integer extractJsonIntegerField(String text, String field) {
        if (text == null || field == null || field.isBlank()) {
            return null;
        }
        Pattern pattern = Pattern.compile("\"" + Pattern.quote(field) + "\"\\s*:\\s*(-?\\d+(?:\\.\\d+)?)");
        Matcher matcher = pattern.matcher(text);
        if (!matcher.find()) {
            return null;
        }

        try {
            return (int) Math.round(Double.parseDouble(matcher.group(1)));
        } catch (NumberFormatException ignored) {
            return null;
        }
    }

    private String extractFirstSentence(String text) {
        if (text == null) return null;
        String normalized = text.replaceAll("\\s+", " ").trim();
        if (normalized.isEmpty()) {
            return null;
        }

        int dot = normalized.indexOf('.');
        int question = normalized.indexOf('?');
        int exclamation = normalized.indexOf('!');

        int end = Integer.MAX_VALUE;
        if (dot >= 0) end = Math.min(end, dot);
        if (question >= 0) end = Math.min(end, question);
        if (exclamation >= 0) end = Math.min(end, exclamation);

        if (end != Integer.MAX_VALUE && end > 8) {
            return normalized.substring(0, end + 1).trim();
        }
        return normalized.length() > 200 ? normalized.substring(0, 200).trim() : normalized;
    }

    private ObjectNode buildCollectorScoresFromText(String text) {
        ObjectNode collector = mapper.createObjectNode();

        Integer maxPrice = firstNonNull(
                extractJsonIntegerField(text, "maxPrice"),
                extractJsonIntegerField(text, "budgetMax"),
                extractJsonIntegerField(text, "budget")
        );
        putIntegerOrNull(collector, "maxPrice", maxPrice);

        Integer cpuWeight = firstNonNull(
                extractJsonIntegerField(text, "cpuWeight"),
                normalizeWeight(extractJsonIntegerField(text, "CPU"))
        );
        Integer gpuWeight = firstNonNull(
                extractJsonIntegerField(text, "gpuWeight"),
                normalizeWeight(extractJsonIntegerField(text, "GPU"))
        );
        Integer ramWeight = firstNonNull(
                extractJsonIntegerField(text, "ramWeight"),
                normalizeWeight(extractJsonIntegerField(text, "RAM"))
        );
        Integer batteryWeight = firstNonNull(
                extractJsonIntegerField(text, "batteryWeight"),
                normalizeWeight(extractJsonIntegerField(text, "Battery"))
        );

        putIntegerOrNull(collector, "cpuWeight", cpuWeight);
        putIntegerOrNull(collector, "gpuWeight", gpuWeight);
        putIntegerOrNull(collector, "ramWeight", ramWeight);
        putIntegerOrNull(collector, "batteryWeight", batteryWeight);
        return collector;
    }

    private Integer firstNonNull(Integer... values) {
        if (values == null) return null;
        for (Integer value : values) {
            if (value != null) {
                return value;
            }
        }
        return null;
    }

    private Integer normalizeWeight(Integer value) {
        if (value == null) {
            return null;
        }
        int normalized = value <= 10 ? value : Math.round(value / 10.0f);
        return Math.max(0, Math.min(10, normalized));
    }

    private void putIntegerOrNull(ObjectNode node, String field, Integer value) {
        if (value == null) {
            node.putNull(field);
        } else {
            node.put(field, value);
        }
    }

    private JsonNode buildFallbackResponse(String message) {
        ObjectNode root = mapper.createObjectNode();
        String assistantMessage = message == null ? "" : message.trim();
        root.put("assistantMessage", assistantMessage);

        ObjectNode state = root.putObject("state");
        state.set("slots", mapper.createObjectNode());
        state.set("confidence", mapper.createObjectNode());
        ArrayNode missing = state.putArray("missingCritical");
        missing.add("budget");
        missing.add("region");
        state.putNull("nextQuestion");

        ObjectNode recommendation = root.putObject("recommendation");
        ObjectNode targetProfile = recommendation.putObject("targetProfile");
        targetProfile.putNull("cpuTier");
        targetProfile.putNull("gpuTier");
        targetProfile.putNull("ramGB");
        targetProfile.putNull("ssdGB");
        targetProfile.putNull("notes");

        recommendation.set("weights", mapper.createObjectNode());
        recommendation.set("scores", mapper.createObjectNode());
        recommendation.put("overallScore", 0);
        ArrayNode bullets = recommendation.putArray("explanationBullets");
        bullets.add("I couldn't compute scores yet.");
        bullets.add("Share your budget and region to proceed.");
        bullets.add("Then tell me your primary use case.");

        ObjectNode toolRequest = root.putObject("toolRequest");
        toolRequest.put("needsLiveData", false);
        toolRequest.set("queries", mapper.createArrayNode());

        return root;
    }

    private JsonNode withLegacyFields(JsonNode response, String assistantMessage) {
        if (!(response instanceof ObjectNode objectNode)) {
            ObjectNode wrapped = mapper.createObjectNode();
            String reply = assistantMessage == null ? "" : assistantMessage;
            wrapped.put("assistantMessage", reply);
            wrapped.put("reply", reply);
            wrapped.put("message", reply);
            wrapped.set("collectorScores", buildCollectorScores(wrapped));
            return wrapped;
        }

        String reply = assistantMessage == null ? "" : assistantMessage;
        if (!hasNonBlankText(objectNode, "assistantMessage")) {
            objectNode.put("assistantMessage", reply);
        }
        if (!hasNonBlankText(objectNode, "reply")) {
            objectNode.put("reply", reply);
        }
        if (!hasNonBlankText(objectNode, "message")) {
            objectNode.put("message", reply);
        }
        JsonNode collectorNode = objectNode.get("collectorScores");
        if (collectorNode == null || collectorNode.isNull() || !collectorNode.isObject()) {
            objectNode.set("collectorScores", buildCollectorScores(objectNode));
        }
        if (!shouldExposeWeights(objectNode)) {
            clearWeightFields(objectNode.with("collectorScores"));
        }
        return objectNode;
    }

    private String extractAssistantMessage(JsonNode response) {
        if (response == null || response.isNull()) {
            return null;
        }

        String assistantMessage = normalizeText(response.path("assistantMessage"));
        if (assistantMessage != null) {
            return assistantMessage;
        }
        String reply = normalizeText(response.path("reply"));
        if (reply != null) {
            return reply;
        }
        String message = normalizeText(response.path("message"));
        if (message != null) {
            return message;
        }
        String text = normalizeText(response.path("text"));
        if (text != null) {
            return text;
        }
        String modelResponse = normalizeText(response.path("response"));
        if (modelResponse != null) {
            return modelResponse;
        }
        return normalizeText(response);
    }

    private String normalizeText(JsonNode node) {
        if (node == null || node.isMissingNode() || node.isNull()) {
            return null;
        }
        String text = node.asText("").trim();
        return text.isEmpty() ? null : text;
    }

    private ObjectNode buildCollectorScores(ObjectNode response) {
        ObjectNode collector = mapper.createObjectNode();

        Integer budget = firstNonNull(
                extractBudget(response.path("collectorScores").path("maxPrice")),
                extractBudget(response.path("state").path("slots").path("budget")),
                extractBudget(response.path("state").path("slots").path("budgetMax")),
                extractBudget(response.path("state").path("slots").path("budgetMin")),
                extractBudget(response.path("budget")),
                extractBudget(response.path("budgetMax"))
        );
        if (budget == null) {
            collector.putNull("maxPrice");
        } else {
            collector.put("maxPrice", budget);
        }

        JsonNode weights = response.path("recommendation").path("weights");
        if (!weights.isObject()) {
            weights = response.path("weights");
        }
        JsonNode collectorScores = response.path("collectorScores");

        putLegacyWeight(
                collector,
                "cpuWeight",
                parseFirstInteger(
                        collectorScores.get("cpuWeight"),
                        response.get("cpuWeight"),
                        weights.get("cpuWeight"),
                        weights.get("CPU")
                )
        );
        putLegacyWeight(
                collector,
                "gpuWeight",
                parseFirstInteger(
                        collectorScores.get("gpuWeight"),
                        response.get("gpuWeight"),
                        weights.get("gpuWeight"),
                        weights.get("GPU")
                )
        );
        putLegacyWeight(
                collector,
                "ramWeight",
                parseFirstInteger(
                        collectorScores.get("ramWeight"),
                        response.get("ramWeight"),
                        weights.get("ramWeight"),
                        weights.get("RAM")
                )
        );
        putLegacyWeight(
                collector,
                "batteryWeight",
                parseFirstInteger(
                        collectorScores.get("batteryWeight"),
                        response.get("batteryWeight"),
                        weights.get("batteryWeight"),
                        weights.get("Battery")
                )
        );
        return collector;
    }

    private Integer parseFirstInteger(JsonNode... nodes) {
        if (nodes == null) {
            return null;
        }
        for (JsonNode node : nodes) {
            Integer value = parseInteger(node);
            if (value != null) {
                return value;
            }
        }
        return null;
    }

    private void putLegacyWeight(ObjectNode collector, String field, Integer value) {
        if (value == null) {
            collector.putNull(field);
            return;
        }
        int scaled = value <= 10 ? value : Math.round(value / 10.0f);
        scaled = Math.max(0, Math.min(10, scaled));
        collector.put(field, scaled);
    }

    private Integer extractBudget(JsonNode budgetNode) {
        if (budgetNode == null || budgetNode.isMissingNode() || budgetNode.isNull()) {
            return null;
        }
        if (budgetNode.isObject()) {
            Integer amount = parseInteger(budgetNode.get("amount"));
            if (amount != null) {
                return amount;
            }
        }
        return parseInteger(budgetNode);
    }

    private Integer parseInteger(JsonNode node) {
        if (node == null || node.isMissingNode() || node.isNull()) {
            return null;
        }
        if (node.isNumber()) {
            return (int) Math.round(node.asDouble());
        }

        String raw = node.asText("").trim();
        if (raw.isEmpty()) {
            return null;
        }

        String normalized = raw.replaceAll("[^0-9.-]", "");
        if (normalized.isEmpty() || "-".equals(normalized) || ".".equals(normalized) || "-.".equals(normalized)) {
            return null;
        }

        try {
            return (int) Math.round(Double.parseDouble(normalized));
        } catch (NumberFormatException ignored) {
            return null;
        }
    }

    private boolean hasNonBlankText(ObjectNode node, String field) {
        JsonNode value = node.get(field);
        return normalizeText(value) != null;
    }

    private boolean shouldExposeWeights(ObjectNode response) {
        JsonNode explicitReady = response.get("readyForWeights");
        if (explicitReady != null && explicitReady.isBoolean() && !explicitReady.asBoolean()) {
            return false;
        }

        JsonNode missingCritical = response.path("state").path("missingCritical");
        if (missingCritical.isArray() && missingCritical.size() > 0) {
            return false;
        }

        String nextQuestion = normalizeText(response.path("nextQuestion"));
        if (nextQuestion != null) {
            return false;
        }

        String nestedNextQuestion = normalizeText(response.path("state").path("nextQuestion"));
        return nestedNextQuestion == null;
    }

    private void clearWeightFields(ObjectNode collectorScores) {
        collectorScores.putNull("cpuWeight");
        collectorScores.putNull("gpuWeight");
        collectorScores.putNull("ramWeight");
        collectorScores.putNull("batteryWeight");
    }

    private ObjectNode emptyScoreMap() {
        ObjectNode node = mapper.createObjectNode();
        node.put("CPU", 0);
        node.put("GPU", 0);
        node.put("RAM", 0);
        node.put("Storage", 0);
        node.put("Display", 0);
        node.put("Battery", 0);
        node.put("Portability", 0);
        node.put("Thermals", 0);
        node.put("Build", 0);
        return node;
    }

    private static class ConversationContext {
        private final List<ClaudeService.ClaudeMessage> messages = new ArrayList<>();

        void addUser(String message) {
            messages.add(new ClaudeService.ClaudeMessage("user", message == null ? "" : message.trim()));
        }

        void addAssistant(String message) {
            messages.add(new ClaudeService.ClaudeMessage("assistant", message == null ? "" : message.trim()));
        }

        List<ClaudeService.ClaudeMessage> getMessages() {
            return messages;
        }

        boolean isEmpty() {
            return messages.isEmpty();
        }
    }
}
