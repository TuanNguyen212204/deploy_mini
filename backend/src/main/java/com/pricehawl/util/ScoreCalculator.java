package com.pricehawl.util;

import com.pricehawl.dto.DealScoreCalculation;
import com.pricehawl.entity.PriceRecord;
import com.pricehawl.entity.ProductListing;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;

public class ScoreCalculator {

    public static DealScoreCalculation calculate(ProductListing listing) {
        PriceRecord latest = listing.getLatestPriceRecord();
        if (latest == null) {
            return DealScoreCalculation.builder().totalDealScore(0.0).build();
        }

        double discount = calculateDiscount(latest.getPrice(), latest.getOriginalPrice());
        double trend = calculateTrend(listing.getPriceRecords());
        double trust = calculateTrust(listing.getTrustScore());
        double popularity = calculatePopularity(listing.getProduct().getPopularityScore());
        double freshness = calculateFreshness(
                listing.getCrawlTime() != null ? listing.getCrawlTime() : latest.getCrawledAt());

        double total = 0.45 * discount + 0.25 * trend + 0.15 * trust + 0.10 * popularity + 0.05 * freshness;

        return DealScoreCalculation.builder()
                .discountScore(discount)
                .trendScore(trend)
                .trustScore(trust)
                .popularityScore(popularity)
                .freshnessScore(freshness)
                .totalDealScore(total)
                .build();
    }

    private static double calculateDiscount(Integer current, Integer original) {
        if (original == null || original <= 0 || current == null) {
            return 0.0;
        }
        double percent = (original - current) / (double) original;
        return Math.min(1.0, Math.max(0.0, percent));
    }

    private static double calculateTrend(List<PriceRecord> records) {
        if (records == null || records.size() < 7) {
            return 0.0;
        }
        records.sort((a, b) -> a.getCrawledAt().compareTo(b.getCrawledAt()));
        double sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
        int n = records.size();
        for (int i = 0; i < n; i++) {
            double x = i;
            double y = records.get(i).getPrice();
            sumX += x;
            sumY += y;
            sumXY += x * y;
            sumX2 += x * x;
        }
        double denom = n * sumX2 - sumX * sumX;
        if (denom == 0) {
            return 0.0;
        }
        double slope = (n * sumXY - sumX * sumY) / denom;
        return Math.min(1.0, Math.max(0.0, -slope / 10000.0));
    }

    private static double calculateTrust(double trustScore) {
        return Math.max(0.0, Math.min(1.0, trustScore));
    }

    private static double calculatePopularity(int popularity) {
        return Math.min(1.0, popularity / 10000.0);
    }

    private static double calculateFreshness(LocalDateTime crawlTime) {
        if (crawlTime == null) {
            return 0.0;
        }
        long hours = ChronoUnit.HOURS.between(crawlTime, LocalDateTime.now());
        if (hours <= 2) {
            return 1.0;
        }
        return Math.max(0.0, 1.0 - (hours - 2) / 48.0);
    }
}
