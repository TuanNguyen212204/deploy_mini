package com.pricehawl.controller;

import com.pricehawl.dto.TrendingDealResponse;
import com.pricehawl.service.TrendingDealService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/trending-deals")
@RequiredArgsConstructor
public class TrendingDealController {

    private final TrendingDealService service;

    @GetMapping
    public ResponseEntity<List<TrendingDealResponse>> getTrendingDeals(
            @RequestParam(defaultValue = "false") boolean expand) {
        return ResponseEntity.ok(service.getTrendingDeals(expand));
    }
}
