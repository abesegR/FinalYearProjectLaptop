package com.laptopai.chat_backend.chat;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface LaptopLkRepository extends JpaRepository<LaptopLk, Long> {

    @Query("SELECT l FROM LaptopLk l WHERE l.priceLkr <= :maxPrice ORDER BY l.priceLkr ASC")
    List<LaptopLk> findByMaxPrice(@Param("maxPrice") Double maxPrice);
}