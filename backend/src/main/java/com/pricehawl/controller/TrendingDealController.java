package com.pricehawl.controller;

import com.pricehawl.dto.TrendingDealModels.TrendingDealResponse;
import com.pricehawl.dto.TrendingDealModels.TrendingDealsSnapshot;
import com.pricehawl.service.TrendingDealService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.concurrent.TimeUnit;

@RestController
@CrossOrigin(origins = "http://localhost:5173")
@RequestMapping("/api/trending-deals")
@RequiredArgsConstructor
public class TrendingDealController {

    private final TrendingDealService trendingDealService;

    @GetMapping
    public ResponseEntity<List<TrendingDealResponse>> getTrendingDeals(
            @RequestParam(defaultValue = "false") boolean expand,
            @RequestParam(defaultValue = "false") boolean refresh) {
        TrendingDealsSnapshot snap;
        try {
            snap = trendingDealService.getTrendingDealsSnapshot(expand, refresh);
        } catch (Exception e) {
            // If DB/network is slow/unreachable, fail fast with a clear status instead of hanging.
            throw new ResponseStatusException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "Không lấy được trending deals (DB/network timeout).",
                    e);
        }
        return ResponseEntity.ok()
                .cacheControl(CacheControl.maxAge(snap.cacheTtlSeconds(), TimeUnit.SECONDS).cachePublic())
                .header("X-Trending-Computed-At", snap.computedAt().toString())
                .header("X-Trending-Next-Refresh-After",
                        snap.computedAt().plusSeconds(snap.cacheTtlSeconds()).toString())
                .header("X-Trending-Cache-Ttl-Seconds", Long.toString(snap.cacheTtlSeconds()))
                .body(snap.deals());
    }
}
