package com.pricehawl.controller;

import com.pricehawl.dto.PriceComparisonResponse;
import com.pricehawl.service.PriceComparisonService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/compare")
@RequiredArgsConstructor
public class PriceComparisonController {

    private final PriceComparisonService priceComparisonService;

    @GetMapping("/{productId}")
    public ResponseEntity<PriceComparisonResponse> comparePrice(@PathVariable UUID productId) {
        PriceComparisonResponse response = priceComparisonService.compareByProductId(productId);
        return ResponseEntity.ok(response);
    }
}