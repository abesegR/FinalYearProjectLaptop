package com.laptopai.chat_backend.chat;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import com.laptopai.chat_backend.chat.LaptopLk;

public interface LaptopRepository extends JpaRepository<Laptop, Long> {
    @Query(value = "SELECT * FROM laptops WHERE price_usd <= :maxPrice", nativeQuery = true)
    List<Laptop> findByMaxPrice(@Param("maxPrice") Double maxPrice);
}