package com.pricehawl.service;

import com.pricehawl.dto.TrendingDealModels.DealScoreCalculation;
import com.pricehawl.entity.*;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

class TrendingDealScorerTest {

    @Test
    void score_returnsZeroWhenNoLatestPrice() {
        ProductListing listing = ProductListing.builder()
                .id(UUID.randomUUID())
                .product(sampleProduct())
                .platform(samplePlatform())
                .platformName("Shop")
                .url("https://example.com/p")
                .build();

        ProductListingSignal signal = ProductListingSignal.builder()
                .listingId(listing.getId())
                .trustScore(0.9)
                .status(TrendingDealEngine.STATUS_ACTIVE)
                .isFakePromo(false)
                .isHijacked(false)
                .isPinned(false)
                .crawlTime(LocalDateTime.now())
                .build();

        DealScoreCalculation calc = TrendingDealEngine.score(listing, signal, List.of());
        assertEquals(0.0, calc.totalDealScore(), 1e-9);
    }

    @Test
    void score_combinesComponentsWhenDataPresent() {
        ProductListing listing = ProductListing.builder()
                .id(UUID.randomUUID())
                .product(sampleProduct())
                .platform(samplePlatform())
                .platformName("Shop")
                .url("https://example.com/q")
                .build();

        List<PriceRecord> history = new ArrayList<>();
        for (int i = 0; i < 7; i++) {
            int price = 100_000 - i * 2_000;
            PriceRecord pr = PriceRecord.builder()
                    .price(price)
                    .originalPrice(120_000)
                    .discountPct((120_000 - price) / 120_000f * 100f)
                    .crawledAt(LocalDateTime.now().minusDays(7 - i))
                    .build();
            pr.setProductListing(listing);
            history.add(pr);
        }
        ProductListingSignal signal = ProductListingSignal.builder()
                .listingId(listing.getId())
                .trustScore(1.0)
                .status(TrendingDealEngine.STATUS_ACTIVE)
                .isFakePromo(false)
                .isHijacked(false)
                .isPinned(false)
                .crawlTime(LocalDateTime.now())
                .build();

        DealScoreCalculation calc = TrendingDealEngine.score(listing, signal, history);
        assertTrue(calc.totalDealScore() > 0);
        assertTrue(calc.discountScore() > 0);
    }

    @Test
    void explanations_meetsMinimumLength() {
        ProductListing listing = listingForExplanation();
        PriceRecord latest = PriceRecord.builder()
                .price(99_000)
                .originalPrice(120_000)
                .discountPct(17.5f)
                .inStock(true)
                .crawledAt(LocalDateTime.now())
                .build();
        latest.setProductListing(listing);
        listing.setPriceRecords(List.of(latest));

        DealScoreCalculation calc = new DealScoreCalculation(
                0.2, 0.3, 0.9, 0.1, 1.0, 0.55);
        String text = TrendingDealEngine.Explanations.forDeal(listing, calc, 17.5f, latest);
        assertTrue(text.length() >= TrendingDealEngine.MIN_EXPLANATION_LENGTH, text);
    }

    private static ProductListing listingForExplanation() {
        Category cat = Category.builder().id(1).name("c").slug("c").build();
        Brand brand = Brand.builder().id(1).name("b").slug("b").build();
        Product p = Product.builder()
                .id(UUID.randomUUID())
                .name("Kem Z")
                .category(cat)
                .brand(brand)
                .popularityScore(50)
                .build();
        return ProductListing.builder()
                .id(UUID.randomUUID())
                .product(p)
                .platform(Platform.builder().id(1).name("Guardian").build())
                .platformName("Guardian")
                .url("https://example.com/z")
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
}
