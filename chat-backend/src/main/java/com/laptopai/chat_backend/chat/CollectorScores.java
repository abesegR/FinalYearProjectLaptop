package com.laptopai.chat_backend.chat;

public record CollectorScores(
        Integer maxPrice,
        Integer cpuWeight,
        Integer gpuWeight,
        Integer ramWeight,
        Integer batteryWeight
) {
    public static CollectorScores from(UserProfile profile) {
        if (profile == null) return null;
        return new CollectorScores(
                profile.getMaxPrice(),
                profile.getCpuWeight(),
                profile.getGpuWeight(),
                profile.getRamWeight(),
                profile.getBatteryWeight()
        );
    }
}
