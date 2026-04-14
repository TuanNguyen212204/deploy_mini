package com.pricehawl.service;

import com.pricehawl.entity.*;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

class TrendingDealEngineTest {

    @Test
    void rejectsWhenPriceSpanLessThanSevenDays() {
        ProductListing listing = baseListing();
        LocalDateTime t0 = LocalDateTime.now().minusDays(3);
        List<PriceRecord> recs = List.of(
                price(listing, t0, 100_000),
                price(listing, t0.plusDays(1), 99_000));
        assertFalse(TrendingDealEngine.hasMinimumPriceHistorySpan(recs));
        assertFalse(TrendingDealEngine.isEligibleForTrending(listing, recs));
    }

    @Test
    void acceptsWhenPriceSpanAtLeastSevenDaysAndRulesOk() {
        ProductListing listing = baseListing();
        LocalDateTime t0 = LocalDateTime.now().minusDays(8);
        List<PriceRecord> recs = new ArrayList<>();
        for (int d = 0; d <= 8; d++) {
            recs.add(price(listing, t0.plusDays(d), 200_000 - d * 1_000));
        }
        assertTrue(TrendingDealEngine.hasMinimumPriceHistorySpan(recs));
        assertTrue(TrendingDealEngine.isEligibleForTrending(listing, recs));
    }

    @Test
    void rejectsWhenLikelyFakePromo() {
        ProductListing listing = baseListing();
        LocalDateTime t0 = LocalDateTime.now().minusDays(10);
        List<PriceRecord> recs = new ArrayList<>();
        for (int d = 0; d <= 7; d++) {
            recs.add(price(listing, t0.plusDays(d), 200_000));
        }
        // "Cliff drop" về giá cực thấp ở cuối -> heuristic fake promo
        recs.add(price(listing, t0.plusDays(8), 30_000));
        assertFalse(TrendingDealEngine.isEligibleForTrending(listing, recs));
    }

    private static ProductListing baseListing() {
        return ProductListing.builder()
                .id(UUID.randomUUID())
                .product(sampleProduct())
                .platform(samplePlatform())
                .platformName("Shop")
                .url("https://example.com/trend-test")
                .build();
    }

    private static Product sampleProduct() {
        Category cat = Category.builder().id(1).name("c").slug("c").build();
        Brand brand = Brand.builder().id(1).name("b").slug("b").build();
        return Product.builder()
                .id(UUID.randomUUID())
                .name("Serum X")
                .category(cat)
                .brand(brand)
                .popularityScore(100)
                .build();
    }

    private static Platform samplePlatform() {
        return Platform.builder().id(1).name("Hasaki").build();
    }

    private static PriceRecord price(ProductListing listing, LocalDateTime at, int price) {
        PriceRecord pr = PriceRecord.builder()
                .price(price)
                .originalPrice(price + 10_000)
                .discountPct(5f)
                .inStock(true)
                .crawledAt(at)
                .build();
        pr.setProductListing(listing);
        return pr;
    }
}
