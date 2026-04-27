package com.laptopai.chat_backend.chat;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.JsonNodeFactory;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.fasterxml.jackson.databind.node.TextNode;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

class ChatControllerTest {

    private ChatController controllerWith(ClaudeService claudeService, ScoringService scoringService) {
        return new ChatController(claudeService, scoringService);
    }

    @Test
    void wrapsTextModelOutputIntoReplyForFrontend() {
        ClaudeService claudeService = mock(ClaudeService.class);
        ScoringService scoringService = mock(ScoringService.class);
        ChatController controller = controllerWith(claudeService, scoringService);
        ChatRequest request = new ChatRequest();
        request.setSessionId("session-1");
        request.setMessage("Hi");

        when(claudeService.generateStructuredResponse(anyList()))
                .thenReturn(TextNode.valueOf("Hello from model"));

        JsonNode response = controller.chat(request);

        assertThat(response.path("assistantMessage").asText()).isEqualTo("Hello from model");
        assertThat(response.path("reply").asText()).isEqualTo("Hello from model");
        assertThat(response.path("collectorScores").isObject()).isTrue();
        verifyNoInteractions(scoringService);
    }

    @Test
    void backfillsReplyWhenModelReturnsNullReplyField() {
        ClaudeService claudeService = mock(ClaudeService.class);
        ScoringService scoringService = mock(ScoringService.class);
        ChatController controller = controllerWith(claudeService, scoringService);
        ChatRequest request = new ChatRequest();
        request.setSessionId("session-2");
        request.setMessage("Need gaming laptop");

        ObjectNode modelResponse = JsonNodeFactory.instance.objectNode();
        modelResponse.put("assistantMessage", "Let's target a strong GPU.");
        modelResponse.putNull("reply");

        when(claudeService.generateStructuredResponse(anyList()))
                .thenReturn(modelResponse);

        JsonNode response = controller.chat(request);

        assertThat(response.path("assistantMessage").asText()).isEqualTo("Let's target a strong GPU.");
        assertThat(response.path("reply").asText()).isEqualTo("Let's target a strong GPU.");
        assertThat(response.path("message").asText()).isEqualTo("Let's target a strong GPU.");
        verifyNoInteractions(scoringService);
    }

    @Test
    void recoversAssistantMessageFromJsonLikeText() {
        ClaudeService claudeService = mock(ClaudeService.class);
        ScoringService scoringService = mock(ScoringService.class);
        ChatController controller = controllerWith(claudeService, scoringService);
        ChatRequest request = new ChatRequest();
        request.setSessionId("session-3");
        request.setMessage("I need a workstation");

        String jsonLikeText = """
                ```json
                {"assistantMessage":"Great, performance matters here.","collectorScores":{"maxPrice":250000,"cpuWeight":9,"gpuWeight":8,"ramWeight":9,"batteryWeight":4}}
                ```
                """;

        when(claudeService.generateStructuredResponse(anyList()))
                .thenReturn(TextNode.valueOf(jsonLikeText));

        JsonNode response = controller.chat(request);

        assertThat(response.path("reply").asText()).isEqualTo("Great, performance matters here.");
        assertThat(response.path("collectorScores").path("maxPrice").asInt()).isEqualTo(250000);
        assertThat(response.path("collectorScores").path("cpuWeight").asInt()).isEqualTo(9);
        assertThat(response.path("collectorScores").path("gpuWeight").asInt()).isEqualTo(8);
        verifyNoInteractions(scoringService);
    }

    @Test
    void hidesWeightsWhileFollowUpQuestionsRemain() {
        ClaudeService claudeService = mock(ClaudeService.class);
        ScoringService scoringService = mock(ScoringService.class);
        ChatController controller = controllerWith(claudeService, scoringService);
        ChatRequest request = new ChatRequest();
        request.setSessionId("session-4");
        request.setMessage("I need a laptop");

        ObjectNode modelResponse = JsonNodeFactory.instance.objectNode();
        modelResponse.put("assistantMessage", "Great start. Which software do you use daily?");
        modelResponse.put("nextQuestion", "Which software do you use daily?");
        modelResponse.put("readyForWeights", false);
        ObjectNode scores = modelResponse.putObject("collectorScores");
        scores.put("maxPrice", 200000);
        scores.put("cpuWeight", 9);
        scores.put("gpuWeight", 7);
        scores.put("ramWeight", 8);
        scores.put("batteryWeight", 6);

        when(claudeService.generateStructuredResponse(anyList()))
                .thenReturn(modelResponse);

        JsonNode response = controller.chat(request);

        assertThat(response.path("collectorScores").path("maxPrice").asInt()).isEqualTo(200000);
        assertThat(response.path("collectorScores").path("cpuWeight").isNull()).isTrue();
        assertThat(response.path("collectorScores").path("gpuWeight").isNull()).isTrue();
        assertThat(response.path("collectorScores").path("ramWeight").isNull()).isTrue();
        assertThat(response.path("collectorScores").path("batteryWeight").isNull()).isTrue();
        verifyNoInteractions(scoringService);
    }

    @Test
    void kickoffTurnDoesNotExposeWeights() {
        ClaudeService claudeService = mock(ClaudeService.class);
        ScoringService scoringService = mock(ScoringService.class);
        ChatController controller = controllerWith(claudeService, scoringService);
        ChatRequest request = new ChatRequest();
        request.setSessionId("session-5");
        request.setMessage("");

        ObjectNode modelResponse = JsonNodeFactory.instance.objectNode();
        modelResponse.put("assistantMessage", "Nice to meet you. What kind of work will you do most?");
        modelResponse.put("readyForWeights", true);
        ObjectNode scores = modelResponse.putObject("collectorScores");
        scores.put("cpuWeight", 8);
        scores.put("gpuWeight", 6);
        scores.put("ramWeight", 7);
        scores.put("batteryWeight", 5);

        when(claudeService.generateStructuredResponse(anyList()))
                .thenReturn(modelResponse);

        JsonNode response = controller.chat(request);

        assertThat(response.path("reply").asText()).isEqualTo("Nice to meet you. What kind of work will you do most?");
        assertThat(response.path("collectorScores").path("cpuWeight").isNull()).isTrue();
        assertThat(response.path("collectorScores").path("gpuWeight").isNull()).isTrue();
        assertThat(response.path("collectorScores").path("ramWeight").isNull()).isTrue();
        assertThat(response.path("collectorScores").path("batteryWeight").isNull()).isTrue();
        verifyNoInteractions(scoringService);
    }
}
