package com.pricehawl.service;

import com.pricehawl.entity.*;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

class TrendingDealFakePromoHeuristicTest {

    @Test
    void flagsSuddenSeventyPlusDiscountAfterLowHistoricalDiscount() {
        ProductListing listing = listing(0.85);
        LocalDateTime t0 = LocalDateTime.now().minusDays(10);
        List<PriceRecord> recs = new ArrayList<>();
        for (int d = 0; d <= 7; d++) {
            recs.add(pr(listing, t0.plusDays(d), 200_000, 210_000, 5f, false));
        }
        recs.add(pr(listing, t0.plusDays(8), 45_000, 200_000, 77.5f, false));
        listing.setPriceRecords(recs);
        assertTrue(TrendingDealEngine.isLikelyFakePromo(listing));
    }

    @Test
    void flagsInflatedOriginalAcrossTimeline() {
        ProductListing listing = listing(0.88);
        LocalDateTime t0 = LocalDateTime.now().minusDays(14);
        List<PriceRecord> recs = new ArrayList<>();
        for (int d = 0; d < 6; d++) {
            recs.add(pr(listing, t0.plusDays(d), 150_000, 160_000, 6f, false));
        }
        for (int d = 6; d <= 10; d++) {
            recs.add(pr(listing, t0.plusDays(d), 70_000, 220_000, 68f, false));
        }
        listing.setPriceRecords(recs);
        assertTrue(TrendingDealEngine.isLikelyFakePromo(listing));
    }

    @Test
    void flagsFlashSaleWithExtremeDiscount() {
        ProductListing listing = listing(0.9);
        LocalDateTime t0 = LocalDateTime.now().minusDays(9);
        List<PriceRecord> recs = new ArrayList<>();
        for (int d = 0; d < 8; d++) {
            recs.add(pr(listing, t0.plusDays(d), 180_000, 200_000, 10f, false));
        }
        recs.add(pr(listing, t0.plusDays(8).plusHours(1), 30_000, 200_000, 85f, true));
        listing.setPriceRecords(recs);
        assertTrue(TrendingDealEngine.isLikelyFakePromo(listing));
    }

    @Test
    void passesOnGradualRealisticHistory() {
        ProductListing listing = listing(0.88);
        LocalDateTime t0 = LocalDateTime.now().minusDays(8);
        List<PriceRecord> recs = new ArrayList<>();
        int base = 224_000;
        for (int d = 0; d <= 8; d++) {
            int price = base - d * 4_500;
            recs.add(pr(listing, t0.plusDays(d), price, 249_000, null, false));
        }
        listing.setPriceRecords(recs);
        assertFalse(TrendingDealEngine.isLikelyFakePromo(listing));
    }

    private static ProductListing listing(double trust) {
        Category cat = Category.builder().id(1).name("c").slug("c").build();
        Brand brand = Brand.builder().id(1).name("b").slug("b").build();
        Product p = Product.builder()
                .id(UUID.randomUUID())
                .name("P")
                .category(cat)
                .brand(brand)
                .popularityScore(100)
                .build();
        return ProductListing.builder()
                .id(UUID.randomUUID())
                .product(p)
                .platform(Platform.builder().id(1).name("Hasaki").isActive(true).build())
                .platformName("Hasaki")
                .url("https://example.com/x")
                .trustScore(trust)
                .status(TrendingDealEngine.STATUS_ACTIVE)
                .isFakePromo(false)
                .build();
    }

    private static PriceRecord pr(
            ProductListing listing,
            LocalDateTime at,
            int price,
            int original,
            Float discountPct,
            boolean flash) {
        PriceRecord r = PriceRecord.builder()
                .price(price)
                .originalPrice(original)
                .discountPct(discountPct)
                .inStock(true)
                .isFlashSale(flash)
                .crawledAt(at)
                .build();
        r.setProductListing(listing);
        return r;
    }
}
