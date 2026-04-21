package com.pricehawl.controller;

import com.pricehawl.dto.PriceHistoryResponse;
import com.pricehawl.service.PriceHistoryService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/price-history")
@RequiredArgsConstructor
public class PriceHistoryController {
    
    private final PriceHistoryService priceHistoryService;
    
    @GetMapping("/{productId}")
    public ResponseEntity<PriceHistoryResponse> getPriceHistory(
        @PathVariable UUID productId
    ) {
        PriceHistoryResponse response = priceHistoryService.getPriceHistory(productId);
        return ResponseEntity.ok(response);
    }
}
