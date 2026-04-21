package com.pricehawl.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Pre-warm snapshot trending để giảm timeout/cold-start trên Render.
 * Không giảm số lượng deal — chỉ làm ấm cache/snapshot.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class TrendingDealsWarmup {

    private final TrendingDealService trendingDealService;

    @EventListener(ApplicationReadyEvent.class)
    public void warmOnStartup() {
        // Warm async đã được service xử lý nội bộ (không treo thread startup).
        try {
            trendingDealService.getTrendingDealsSnapshot(false, false);
            trendingDealService.getTrendingDealsSnapshot(true, false);
            log.info("Trending deals warm-up triggered on startup");
        } catch (Exception ex) {
            log.warn("Trending warm-up trigger failed at startup: {}", ex.toString());
        }
    }

    /**
     * Re-warm định kỳ. fixedDelay: chạy sau khi lần trước kết thúc.
     * Render free tier có thể sleep; khi wake, job sẽ chạy lại.
     */
    @Scheduled(fixedDelayString = "${pricehawl.trending.warmup.delay-ms:1800000}")
    public void periodicWarm() {
        try {
            trendingDealService.getTrendingDealsSnapshot(false, true); // refresh snapshot
            trendingDealService.getTrendingDealsSnapshot(true, true);
            log.info("Trending deals refreshed by scheduler");
        } catch (Exception ex) {
            log.warn("Trending scheduled refresh failed: {}", ex.toString());
        }
    }
}

