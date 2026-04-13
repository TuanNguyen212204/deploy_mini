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
        ProductListingSignal signal = baseSignal(listing.getId());
        LocalDateTime t0 = LocalDateTime.now().minusDays(3);
        List<PriceRecord> recs = List.of(
                price(listing, t0, 100_000),
                price(listing, t0.plusDays(1), 99_000));
        assertFalse(TrendingDealEngine.hasMinimumPriceHistorySpan(recs));
        assertFalse(TrendingDealEngine.isEligibleForTrending(listing, signal, recs));
    }

    @Test
    void acceptsWhenPriceSpanAtLeastSevenDaysAndRulesOk() {
        ProductListing listing = baseListing();
        ProductListingSignal signal = baseSignal(listing.getId());
        LocalDateTime t0 = LocalDateTime.now().minusDays(8);
        List<PriceRecord> recs = new ArrayList<>();
        for (int d = 0; d <= 8; d++) {
            recs.add(price(listing, t0.plusDays(d), 200_000 - d * 1_000));
        }
        assertTrue(TrendingDealEngine.hasMinimumPriceHistorySpan(recs));
        assertTrue(TrendingDealEngine.isEligibleForTrending(listing, signal, recs));
    }

    @Test
    void rejectsFakePromoInactiveLowTrust() {
        ProductListing listing = baseListing();
        List<PriceRecord> recs = List.of(price(listing, LocalDateTime.now().minusDays(8), 100_000),
                price(listing, LocalDateTime.now(), 90_000));

        ProductListingSignal signal = baseSignal(listing.getId());
        signal.setIsFakePromo(true);
        assertFalse(TrendingDealEngine.isEligibleForTrending(listing, signal, recs));

        signal = baseSignal(listing.getId());
        signal.setStatus("INACTIVE");
        assertFalse(TrendingDealEngine.isEligibleForTrending(listing, signal, recs));

        signal = baseSignal(listing.getId());
        signal.setTrustScore(0.49);
        assertFalse(TrendingDealEngine.isEligibleForTrending(listing, signal, recs));
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

    private static ProductListingSignal baseSignal(UUID listingId) {
        return ProductListingSignal.builder()
                .listingId(listingId)
                .trustScore(0.9)
                .status(TrendingDealEngine.STATUS_ACTIVE)
                .isFakePromo(false)
                .isHijacked(false)
                .isPinned(false)
                .crawlTime(LocalDateTime.now())
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
