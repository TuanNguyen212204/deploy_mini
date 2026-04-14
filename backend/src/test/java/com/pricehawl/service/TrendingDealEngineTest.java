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
    void rejectsWhenDiscountNotGreaterThanTenPct() {
        ProductListing listing = baseListing();
        LocalDateTime t0 = LocalDateTime.now().minusHours(1);
        List<PriceRecord> recs = List.of(
                price(listing, t0, 100_000, 105_000, 5f));
        assertFalse(TrendingDealEngine.isEligibleOrganic(listing, recs));
    }

    @Test
    void acceptsWhenMeetsEligibilityRules() {
        ProductListing listing = baseListing();
        LocalDateTime t0 = LocalDateTime.now().minusHours(1);
        List<PriceRecord> recs = List.of(
                price(listing, t0, 100_000, 120_000, 16.7f));
        assertTrue(TrendingDealEngine.isEligibleOrganic(listing, recs));
    }

    @Test
    void rejectsWhenPopularityNotGreaterThanSixty() {
        ProductListing listing = baseListingWithPopularity(60);
        LocalDateTime t0 = LocalDateTime.now().minusHours(1);
        List<PriceRecord> recs = List.of(
                price(listing, t0, 100_000, 120_000, 16.7f));
        assertFalse(TrendingDealEngine.isEligibleOrganic(listing, recs));
    }

    @Test
    void rejectsWhenTrustScoreBelowPointFive() {
        ProductListing listing = baseListingWithTrust(0.49);
        LocalDateTime t0 = LocalDateTime.now().minusHours(1);
        List<PriceRecord> recs = List.of(
                price(listing, t0, 100_000, 120_000, 16.7f));
        assertFalse(TrendingDealEngine.isEligibleOrganic(listing, recs));
    }

    @Test
    void doesNotCrashWhenFlashSaleIsNull() {
        ProductListing listing = baseListing();
        LocalDateTime t0 = LocalDateTime.now().minusHours(1);
        PriceRecord pr = price(listing, t0, 100_000, 120_000, 16.7f);
        pr.setIsFlashSale(null);
        assertTrue(TrendingDealEngine.isEligibleOrganic(listing, List.of(pr)));
    }

    private static ProductListing baseListing() {
        return ProductListing.builder()
                .id(UUID.randomUUID())
                .product(sampleProduct())
                .platform(samplePlatform())
                .platformName("Shop")
                .url("https://example.com/trend-test")
                .trustScore(0.50)
                .isPinned(false)
                .build();
    }

    private static ProductListing baseListingWithPopularity(int popularityScore) {
        Product p = sampleProduct();
        p.setPopularityScore(popularityScore);
        ProductListing l = baseListing();
        l.setProduct(p);
        return l;
    }

    private static ProductListing baseListingWithTrust(double trustScore) {
        ProductListing l = baseListing();
        l.setTrustScore(trustScore);
        return l;
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

    private static PriceRecord price(ProductListing listing, LocalDateTime at, int price, int originalPrice, float discountPct) {
        PriceRecord pr = PriceRecord.builder()
                .price(price)
                .originalPrice(originalPrice)
                .discountPct(discountPct)
                .inStock(true)
                .crawledAt(at)
                .build();
        pr.setProductListing(listing);
        return pr;
    }
}
