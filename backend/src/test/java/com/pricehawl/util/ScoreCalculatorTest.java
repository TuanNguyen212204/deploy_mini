package com.pricehawl.util;

import com.pricehawl.dto.DealScoreCalculation;
import com.pricehawl.entity.*;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

class ScoreCalculatorTest {

    @Test
    void calculate_returnsZeroWhenNoLatestPrice() {
        ProductListing listing = ProductListing.builder()
                .id(UUID.randomUUID())
                .product(sampleProduct())
                .platform(samplePlatform())
                .platformName("Shop")
                .url("https://example.com/p")
                .build();

        DealScoreCalculation calc = ScoreCalculator.calculate(listing);
        assertEquals(0.0, calc.getTotalDealScore(), 1e-9);
    }

    @Test
    void calculate_combinesScoresWhenDataPresent() {
        ProductListing listing = ProductListing.builder()
                .id(UUID.randomUUID())
                .product(sampleProduct())
                .platform(samplePlatform())
                .platformName("Shop")
                .url("https://example.com/q")
                .trustScore(1.0)
                .crawlTime(LocalDateTime.now())
                .build();

        List<PriceRecord> history = new ArrayList<>();
        for (int i = 0; i < 7; i++) {
            int price = 100 - i;
            PriceRecord pr = PriceRecord.builder()
                    .price(price)
                    .originalPrice(100)
                    .discountPct((100f - price) / 100f * 100f)
                    .crawledAt(LocalDateTime.now().minusHours(6 - i))
                    .build();
            pr.setProductListing(listing);
            history.add(pr);
        }
        listing.setPriceRecords(history);

        DealScoreCalculation calc = ScoreCalculator.calculate(listing);
        assertTrue(calc.getTotalDealScore() > 0);
        assertTrue(calc.getDiscountScore() > 0);
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
