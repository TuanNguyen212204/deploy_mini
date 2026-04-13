package com.pricehawl.repository;

import com.pricehawl.entity.Category;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface CategoryRepository extends JpaRepository<Category, Integer> {
}