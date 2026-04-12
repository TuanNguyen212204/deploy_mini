package com.pricehawl.service;

import com.pricehawl.dto.ProductSearchDTO;
import com.pricehawl.repository.ProductRepository;

import org.springframework.stereotype.Service;

import java.util.Collections;
import java.util.List;
import java.util.UUID;

@Service
public class ProductService {

    private final ProductRepository repository;

    // Constructor injection (khuyến nghị)
    public ProductService(ProductRepository repository) {
        this.repository = repository;
    }

    public List<ProductSearchDTO> search(String keyword) {

        if (keyword == null || keyword.trim().length() < 2) {
            return Collections.emptyList();
        }

        keyword = keyword.trim();

        List<Object[]> rows = repository.fuzzySearchRaw(keyword);
        if (rows == null || rows.isEmpty()) {
            return Collections.emptyList();
        }

        return rows.stream().map(r -> new ProductSearchDTO(
                (UUID) r[0], // id
                (String) r[1], // name
                (String) r[2], // description
                (String) r[3], // categoryName
                (String) r[4], // brandName
                r[5] != null ? ((Number) r[5]).doubleValue() : 0.0 // score
        )).toList();
    }
}
