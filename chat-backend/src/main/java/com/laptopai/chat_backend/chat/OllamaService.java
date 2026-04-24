package com.laptopai.chat_backend.chat;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;

/**
 * Enhanced Ollama Service optimized for small local models
 * Tested with: llama3.2 (3B), phi3 (3.8B), mistral (7B)
 */
@Service
public class OllamaService {

    private static final String OLLAMA_API_URL = "http://localhost:11434/api/generate";
    private static final String MODEL = "llama3.2"; // Change to "phi3" if preferred

    private final HttpClient httpClient;
    private final ObjectMapper mapper;

    public OllamaService() {
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(10))
                .build();
        this.mapper = new ObjectMapper();
    }

    /**
     * Generate response with optimized parameters for small models
     *
     * @param prompt The complete prompt (system + user context)
     * @return Raw model response
     */
    public String chatOnce(String prompt) {
        try {
            // Build request body with carefully tuned parameters
            ObjectNode requestBody = mapper.createObjectNode();
            requestBody.put("model", MODEL);
            requestBody.put("prompt", prompt);
            requestBody.put("stream", false); // We want complete response

            // === CRITICAL PARAMETERS FOR SMALL MODELS ===

            // Temperature: Low for consistency (0.2-0.4 range)
            // - 0.0 = Too robotic, may repeat exact phrases
            // - 0.3 = Sweet spot: natural but consistent
            // - 0.7+ = Too creative, more hallucinations
            requestBody.put("temperature", 0.3);

            // num_predict: Keep responses SHORT
            // Small models lose coherence in long outputs
            requestBody.put("num_predict", 80); // ~40-50 words

            // top_k: Limit vocabulary choices
            // Reduces hallucinations and weird word choices
            requestBody.put("top_k", 40);

            // top_p: Nucleus sampling
            // 0.9 = Good balance between variety and coherence
            requestBody.put("top_p", 0.9);

            // repeat_penalty: Prevent repetitive responses
            // 1.1 = Slight penalty (models already avoid repetition)
            requestBody.put("repeat_penalty", 1.1);

            // num_ctx: Context window size
            // llama3.2 supports up to 128K, but smaller is faster
            // 2048 tokens = ~1500 words (enough for our use case)
            requestBody.put("num_ctx", 2048);

            // stop sequences: Force proper ending
            // Helps prevent rambling
            requestBody.set("stop", mapper.createArrayNode()
                    .add("\n\n")
                    .add("User:")
                    .add("Assistant:"));

            // Create HTTP request
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(OLLAMA_API_URL))
                    .header("Content-Type", "application/json")
                    .timeout(Duration.ofSeconds(30)) // Increase timeout for 4GB GPU
                    .POST(HttpRequest.BodyPublishers.ofString(requestBody.toString()))
                    .build();

            // Send request and get response
            HttpResponse<String> response = httpClient.send(
                    request,
                    HttpResponse.BodyHandlers.ofString()
            );

            if (response.statusCode() != 200) {
                System.err.println("Ollama error: " + response.statusCode());
                return getFallbackResponse();
            }

            // Parse Ollama response
            JsonNode responseJson = mapper.readTree(response.body());

            if (responseJson.has("response")) {
                String generatedText = responseJson.get("response").asText().trim();

                // Log for debugging (optional)
                if (responseJson.has("eval_duration")) {
                    long durationMs = responseJson.get("eval_duration").asLong() / 1_000_000;
                    System.out.println("Generated in " + durationMs + "ms");
                }

                return generatedText;
            }

            return getFallbackResponse();

        } catch (Exception e) {
            System.err.println("Ollama service error: " + e.getMessage());
            e.printStackTrace();
            return getFallbackResponse();
        }
    }

    /**
     * Fallback response when Ollama fails
     */
    private String getFallbackResponse() {
        return "Hmm, I'm having trouble thinking. Can you try rephrasing that? 🤔";
    }

    /**
     * Check if Ollama is running and model is available
     * Call this at startup to validate setup
     */
    public boolean isHealthy() {
        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create("http://localhost:11434/api/tags"))
                    .timeout(Duration.ofSeconds(5))
                    .GET()
                    .build();

            HttpResponse<String> response = httpClient.send(
                    request,
                    HttpResponse.BodyHandlers.ofString()
            );

            if (response.statusCode() == 200) {
                JsonNode models = mapper.readTree(response.body());

                // Check if our model is available
                if (models.has("models")) {
                    for (JsonNode model : models.get("models")) {
                        if (model.get("name").asText().startsWith(MODEL)) {
                            return true;
                        }
                    }
                }
            }

            System.err.println("Model '" + MODEL + "' not found. Run: ollama pull " + MODEL);
            return false;

        } catch (Exception e) {
            System.err.println("Ollama health check failed: " + e.getMessage());
            return false;
        }
    }

    /**
     * Get available models (for debugging/admin)
     */
    public String getAvailableModels() {
        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create("http://localhost:11434/api/tags"))
                    .timeout(Duration.ofSeconds(5))
                    .GET()
                    .build();

            HttpResponse<String> response = httpClient.send(
                    request,
                    HttpResponse.BodyHandlers.ofString()
            );

            return response.body();

        } catch (Exception e) {
            return "Error fetching models: " + e.getMessage();
        }
    }
}

/**
 * PARAMETER TUNING GUIDE FOR SMALL MODELS (4GB GPU)
 *
 * === RECOMMENDED SETTINGS ===
 *
 * For llama3.2 (3B):
 *   temperature: 0.3 (natural but focused)
 *   num_predict: 80 (short responses)
 *   top_k: 40
 *   top_p: 0.9
 *   repeat_penalty: 1.1
 *   num_ctx: 2048 (sufficient for chat)
 *
 * For phi3 (3.8B):
 *   temperature: 0.2 (more deterministic)
 *   num_predict: 100 (slightly longer)
 *   top_k: 40
 *   top_p: 0.85
 *   repeat_penalty: 1.15 (phi3 tends to repeat)
 *   num_ctx: 4096 (phi3 handles larger contexts)
 *
 * === WHEN RESPONSES ARE... ===
 *
 * Too robotic/repetitive:
 *   → Increase temperature to 0.4-0.5
 *   → Increase top_p to 0.95
 *
 * Too random/hallucinating:
 *   → Decrease temperature to 0.2
 *   → Decrease top_k to 30
 *   → Increase repeat_penalty to 1.2
 *
 * Too long/rambling:
 *   → Decrease num_predict to 60
 *   → Add more stop sequences
 *   → Simplify the prompt
 *
 * Ignoring JSON format:
 *   → Decrease temperature to 0.1
 *   → Add examples in prompt
 *   → Use keyword inference as fallback (already implemented)
 *
 * Too slow:
 *   → Decrease num_ctx to 1024
 *   → Decrease num_predict to 60
 *   → Consider switching to phi3 (faster on some GPUs)
 *
 * === GPU MEMORY OPTIMIZATION ===
 *
 * If Ollama crashes or is slow:
 *
 * 1. Check GPU memory usage:
 *    nvidia-smi
 *
 * 2. Reduce context window:
 *    num_ctx: 1024 (saves ~500MB)
 *
 * 3. Use quantized model:
 *    ollama pull llama3.2:3b-q4_K_M
 *    (4-bit quantization, ~2GB VRAM)
 *
 * 4. Enable CPU offloading (in Ollama):
 *    Set OLLAMA_NUM_GPU=0.5 (uses GPU + CPU)
 */