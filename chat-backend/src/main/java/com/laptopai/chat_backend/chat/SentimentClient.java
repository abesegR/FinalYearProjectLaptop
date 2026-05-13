package com.laptopai.chat_backend.chat;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;

@Service
public class SentimentClient {

    private static final Logger log = LoggerFactory.getLogger(SentimentClient.class);
    private static final String SENTIMENT_URL = "http://localhost:5000/sentiment";

    private final HttpClient httpClient;
    private final ObjectMapper mapper;
    private final boolean enabled;

    public SentimentClient(@Value("${sentiment.api.enabled:false}") boolean enabled) {
        this.enabled = enabled;
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(1))
                .build();
        this.mapper = new ObjectMapper();
    }

    /**
     * Calls the Python sentiment service for a given laptop.
     * Returns null if the service is unavailable (non-blocking).
     */
    public JsonNode getSentiment(String laptopName, String brand) {
        if (!enabled) {
            return null;
        }
        try {
            String body = mapper.writeValueAsString(
                    mapper.createObjectNode()
                            .put("laptopName", laptopName)
                            .put("brand", brand == null ? "" : brand)
            );

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(SENTIMENT_URL))
                    .header("Content-Type", "application/json")
                    .timeout(Duration.ofSeconds(3))
                    .POST(HttpRequest.BodyPublishers.ofString(body))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() == 200) {
                return mapper.readTree(response.body());
            } else {
                log.warn("Sentiment service returned status {}", response.statusCode());
                return null;
            }
        } catch (Exception e) {
            log.warn("Sentiment service unavailable: {}", e.getMessage());
            return null;
        }
    }
}
