package com.pricehawl.controller;

import com.pricehawl.dto.ProductModels.ProductSummaryResponse;
import com.pricehawl.repository.TrendingDealRepositories.ProductRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/products")
@RequiredArgsConstructor
public class ProductController {

    private final ProductRepository productRepository;

    @GetMapping
    public Page<ProductSummaryResponse> listProducts(
            @PageableDefault(size = 20) Pageable pageable) {
        return productRepository.findAll(pageable).map(ProductSummaryResponse::from);
    }

    @GetMapping("/{id}")
    public ResponseEntity<ProductSummaryResponse> getProduct(@PathVariable UUID id) {
        return productRepository.findById(id)
                .map(ProductSummaryResponse::from)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }
}
