package com.laptopai.chat_backend.chat;

public class ChatResponse {
    private String reply;
    private CollectorScores collectorScores;

    public ChatResponse(String reply) {
        this(reply, null);
    }

    public ChatResponse(String reply, CollectorScores collectorScores) {
        this.reply = reply;
        this.collectorScores = collectorScores;
    }

    public String getReply() { return reply; }
    public CollectorScores getCollectorScores() { return collectorScores; }
}
