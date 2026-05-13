package com.laptopai.chat_backend.chat;

import jakarta.persistence.*;

@Entity
@Table(name = "laptops")
public class Laptop {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "laptop_name") private String name;
    private String brand;
    private String model;
    private String cpu;
    @Column(name = "ram_gb") private Integer ram;
    private Integer storage;
    @Column(name = "storage_type") private String storageType;
    private String gpu;
    private Double screen;
    @Column(name = "price_usd") private Double price;

    public Long getId() { return id; }
    public String getName() { return name; }
    public String getBrand() { return brand; }
    public String getCpu() { return cpu; }
    public Integer getRam() { return ram; }
    public Integer getStorage() { return storage; }
    public String getGpu() { return gpu; }
    public Double getScreen() { return screen; }
    public Double getPrice() { return price; }
}