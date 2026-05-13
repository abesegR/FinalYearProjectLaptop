package com.laptopai.chat_backend.chat;

import org.springframework.stereotype.Service;

import java.time.Clock;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class RateLimitService {

    private final Clock clock;
    private final Map<String, TokenBucket> buckets = new ConcurrentHashMap<>();

    public RateLimitService() {
        this(Clock.systemUTC());
    }

    RateLimitService(Clock clock) {
        this.clock = clock;
    }

    public boolean tryConsume(String key, int capacity, long refillTokens, long refillPeriodMillis) {
        TokenBucket bucket = buckets.computeIfAbsent(
                key,
                ignored -> new TokenBucket(capacity, capacity, clock.millis())
        );
        return bucket.tryConsume(capacity, refillTokens, refillPeriodMillis, clock.millis());
    }

    private static class TokenBucket {
        private int tokens;
        private int capacity;
        private long lastRefillAt;

        TokenBucket(int tokens, int capacity, long lastRefillAt) {
            this.tokens = tokens;
            this.capacity = capacity;
            this.lastRefillAt = lastRefillAt;
        }

        synchronized boolean tryConsume(int newCapacity, long refillTokens, long refillPeriodMillis, long now) {
            if (newCapacity != capacity) {
                capacity = newCapacity;
                tokens = Math.min(tokens, capacity);
            }

            refill(refillTokens, refillPeriodMillis, now);
            if (tokens <= 0) {
                return false;
            }
            tokens--;
            return true;
        }

        private void refill(long refillTokens, long refillPeriodMillis, long now) {
            if (refillPeriodMillis <= 0 || refillTokens <= 0 || now <= lastRefillAt) {
                return;
            }

            long periods = (now - lastRefillAt) / refillPeriodMillis;
            if (periods <= 0) {
                return;
            }

            long refillAmount = periods * refillTokens;
            tokens = (int) Math.min(capacity, tokens + refillAmount);
            lastRefillAt += periods * refillPeriodMillis;
        }
    }
}
