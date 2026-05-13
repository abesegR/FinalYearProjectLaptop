package com.laptopai.chat_backend.chat;

import jakarta.persistence.*;

@Entity
@Table(name = "laptops_lk")
public class LaptopLk {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "laptop_name") private String name;
    private String brand;
    private String cpu;
    @Column(name = "ram_gb") private Integer ram;
    @Column(name = "storage_gb") private Integer storage;
    @Column(name = "storage_type") private String storageType;
    private String gpu;
    @Column(name = "screen_inch") private Double screen;
    @Column(name = "price_lkr") private Double priceLkr;
    private String availability;
    @Column(name = "source_site") private String sourceSite;
    @Column(name = "product_url") private String productUrl;

    public Long getId() { return id; }
    public String getName() { return name; }
    public String getBrand() { return brand; }
    public String getCpu() { return cpu; }
    public Integer getRam() { return ram; }
    public Integer getStorage() { return storage; }
    public String getStorageType() { return storageType; }
    public String getGpu() { return gpu; }
    public Double getScreen() { return screen; }
    public Double getPriceLkr() { return priceLkr; }
    public String getAvailability() { return availability; }
    public String getSourceSite() { return sourceSite; }
    public String getProductUrl() { return productUrl; }
}