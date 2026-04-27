package com.laptopai.chat_backend.chat;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface LaptopRepository extends JpaRepository<Laptop, Long> {
    @Query("SELECT l FROM Laptop l WHERE (:maxPrice IS NULL OR l.price <= :maxPrice)")
    List<Laptop> findByMaxPrice(@Param("maxPrice") Double maxPrice);
}
