package com.laptopai.chat_backend.chat;

public class UserProfile {
    private Integer maxPrice;
    private Integer cpuWeight;
    private Integer gpuWeight;
    private Integer ramWeight;
    private Integer batteryWeight;

    private String primaryUse;
    private String graphicsNeed;
    private String multitaskingNeed;
    private String batteryNeed;

    public boolean isComplete() {
        return maxPrice != null && maxPrice > 0
                && primaryUse != null
                && graphicsNeed != null
                && multitaskingNeed != null
                && batteryNeed != null
                && cpuWeight != null
                && gpuWeight != null
                && ramWeight != null
                && batteryWeight != null;
    }

    // Getters and Setters
    public Integer getMaxPrice() { return maxPrice; }
    public void setMaxPrice(Integer maxPrice) { this.maxPrice = maxPrice; }

    public Integer getCpuWeight() { return cpuWeight; }
    public void setCpuWeight(Integer cpuWeight) { this.cpuWeight = clampWeight(cpuWeight); }

    public Integer getGpuWeight() { return gpuWeight; }
    public void setGpuWeight(Integer gpuWeight) { this.gpuWeight = clampWeight(gpuWeight); }

    public Integer getRamWeight() { return ramWeight; }
    public void setRamWeight(Integer ramWeight) { this.ramWeight = clampWeight(ramWeight); }

    public Integer getBatteryWeight() { return batteryWeight; }
    public void setBatteryWeight(Integer batteryWeight) { this.batteryWeight = clampWeight(batteryWeight); }

    public String getPrimaryUse() { return primaryUse; }
    public void setPrimaryUse(String primaryUse) { this.primaryUse = normalizeText(primaryUse); }

    public String getGraphicsNeed() { return graphicsNeed; }
    public void setGraphicsNeed(String graphicsNeed) { this.graphicsNeed = normalizeText(graphicsNeed); }

    public String getMultitaskingNeed() { return multitaskingNeed; }
    public void setMultitaskingNeed(String multitaskingNeed) { this.multitaskingNeed = normalizeText(multitaskingNeed); }

    public String getBatteryNeed() { return batteryNeed; }
    public void setBatteryNeed(String batteryNeed) { this.batteryNeed = normalizeText(batteryNeed); }

    private Integer clampWeight(Integer weight) {
        if (weight == null) return null;
        return Math.max(0, Math.min(10, weight));
    }

    private String normalizeText(String value) {
        if (value == null) return null;
        String trimmed = value.trim();
        return trimmed.isBlank() ? null : trimmed;
    }

    @Override
    public String toString() {
        return "MaxPrice=" + maxPrice
                + ", Use=" + primaryUse
                + ", GraphicsNeed=" + graphicsNeed
                + ", MultitaskingNeed=" + multitaskingNeed
                + ", BatteryNeed=" + batteryNeed
                + ", CPU=" + cpuWeight
                + ", GPU=" + gpuWeight
                + ", RAM=" + ramWeight
                + ", Battery=" + batteryWeight;
    }
}
