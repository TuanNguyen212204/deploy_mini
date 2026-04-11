package com.pricehawl.config;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.annotation.Profile;
import org.springframework.context.event.EventListener;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

/**
 * Tạo listing & lịch sử giá demo thỏa {@code findValidListingsForTrending} để UI có dữ liệu.
 * Idempotent (UUID cố định). Tắt: {@code app.seed-trending-demo=false}.
 */
@Component
@Profile("!test")
@ConditionalOnProperty(name = "app.seed-trending-demo", havingValue = "true", matchIfMissing = true)
public class TrendingDemoDataLoader {

    private static final UUID PRODUCT_A = UUID.fromString("a1000000-0000-4000-8000-000000000001");
    private static final UUID PRODUCT_B = UUID.fromString("a1000000-0000-4000-8000-000000000002");
    private static final UUID LISTING_A = UUID.fromString("b2000000-0000-4000-8000-000000000001");
    private static final UUID LISTING_B = UUID.fromString("b2000000-0000-4000-8000-000000000002");

    private static final String CAT_SLUG = "demo-trending-cat";
    private static final String BRAND_SLUG = "demo-trending-brand";

    private final JdbcTemplate jdbc;

    public TrendingDemoDataLoader(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Order(100)
    @EventListener(ApplicationReadyEvent.class)
    @Transactional
    public void seedTrendingDemo() {
        if (Boolean.TRUE.equals(bothDemoListingsReady())) {
            return;
        }

        seedPlatformsIfEmpty();

        jdbc.update("""
                INSERT INTO category (name, slug, parent_id)
                SELECT 'Chăm sóc da (demo)', ?, NULL
                WHERE NOT EXISTS (SELECT 1 FROM category WHERE slug = ?)
                """, CAT_SLUG, CAT_SLUG);

        jdbc.update("""
                INSERT INTO brand (name, slug, country_of_origin)
                SELECT 'Brand Demo Trending', ?, 'VN'
                WHERE NOT EXISTS (SELECT 1 FROM brand WHERE slug = ?)
                """, BRAND_SLUG, BRAND_SLUG);

        Integer categoryId = jdbc.queryForObject(
                "SELECT id FROM category WHERE slug = ? LIMIT 1",
                Integer.class,
                CAT_SLUG);
        Integer brandId = jdbc.queryForObject(
                "SELECT id FROM brand WHERE slug = ? LIMIT 1",
                Integer.class,
                BRAND_SLUG);

        upsertProduct(PRODUCT_A, "Serum Vitamin C cấp ẩm [DEMO-TRENDING-A]",
                categoryId, brandId,
                "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&w=600&q=80",
                4200);
        upsertProduct(PRODUCT_B, "Kem dưỡng ẩm đêm [DEMO-TRENDING-B]",
                categoryId, brandId,
                "https://images.unsplash.com/photo-1556228578-8c89e6adf883?auto=format&fit=crop&w=600&q=80",
                3800);

        upsertListing(LISTING_A, PRODUCT_A, 3, "Hasaki",
                "https://hasaki.vn/demo-trending-listing-a", 0.88, true);
        upsertListing(LISTING_B, PRODUCT_B, 2, "Guardian",
                "https://guardian.com.vn/demo-trending-listing-b", 0.72, false);

        jdbc.update("DELETE FROM price_record WHERE product_listing_id IN (CAST(? AS UUID), CAST(? AS UUID))",
                LISTING_A.toString(), LISTING_B.toString());

        insertPriceHistory(LISTING_A, 189_000, 249_000);
        insertPriceHistory(LISTING_B, 329_000, 399_000);
    }

    private Boolean bothDemoListingsReady() {
        Integer a = jdbc.queryForObject(
                """
                        SELECT COUNT(*) FROM product_listing pl
                        WHERE pl.id = CAST(? AS UUID)
                          AND pl.trust_score >= 0.50
                          AND pl.status = 'ACTIVE'
                          AND pl.is_fake_promo = FALSE
                          AND pl.crawl_time IS NOT NULL
                          AND (SELECT COUNT(*) FROM price_record pr WHERE pr.product_listing_id = pl.id) >= 7
                        """,
                Integer.class,
                LISTING_A.toString());
        Integer b = jdbc.queryForObject(
                """
                        SELECT COUNT(*) FROM product_listing pl
                        WHERE pl.id = CAST(? AS UUID)
                          AND pl.trust_score >= 0.50
                          AND pl.status = 'ACTIVE'
                          AND pl.is_fake_promo = FALSE
                          AND pl.crawl_time IS NOT NULL
                          AND (SELECT COUNT(*) FROM price_record pr WHERE pr.product_listing_id = pl.id) >= 7
                        """,
                Integer.class,
                LISTING_B.toString());
        return a != null && a == 1 && b != null && b == 1;
    }

    private void seedPlatformsIfEmpty() {
        Integer n = jdbc.queryForObject("SELECT COUNT(*) FROM platform", Integer.class);
        if (n != null && n >= 3) {
            return;
        }
        jdbc.update("""
                INSERT INTO platform (id, name, base_url, logo_url, is_active)
                VALUES (1, 'Cocolux', 'https://cocolux.com', NULL, TRUE)
                ON CONFLICT (id) DO NOTHING
                """);
        jdbc.update("""
                INSERT INTO platform (id, name, base_url, logo_url, is_active)
                VALUES (2, 'Guardian', 'https://guardian.com.vn', NULL, TRUE)
                ON CONFLICT (id) DO NOTHING
                """);
        jdbc.update("""
                INSERT INTO platform (id, name, base_url, logo_url, is_active)
                VALUES (3, 'Hasaki', 'https://hasaki.vn', NULL, TRUE)
                ON CONFLICT (id) DO NOTHING
                """);
    }

    private void upsertProduct(UUID id, String name, int categoryId, int brandId, String imageUrl, int popularity) {
        jdbc.update("""
                INSERT INTO product (id, name, category_id, brand_id, description, image_url, popularity_score, created_at, updated_at)
                VALUES (CAST(? AS UUID), ?, ?, ?, ?, ?, ?, NOW(), NOW())
                ON CONFLICT (id) DO UPDATE SET
                    name = EXCLUDED.name,
                    image_url = EXCLUDED.image_url,
                    popularity_score = EXCLUDED.popularity_score,
                    updated_at = NOW()
                """,
                id.toString(), name, categoryId, brandId,
                "Sản phẩm demo cho màn trending — có thể xóa sau.",
                imageUrl, popularity);
    }

    private void upsertListing(UUID id, UUID productId, int platformId, String platformName, String url,
                               double trustScore, boolean pinned) {
        jdbc.update("""
                INSERT INTO product_listing (
                    id, product_id, platform_id, platform_name, url, updated_at,
                    trust_score, status, is_fake_promo, is_pinned, crawl_time
                )
                VALUES (
                    CAST(? AS UUID), CAST(? AS UUID), ?, ?, ?, NOW(),
                    ?, 'ACTIVE', FALSE, ?, NOW()
                )
                ON CONFLICT (id) DO UPDATE SET
                    trust_score = EXCLUDED.trust_score,
                    status = 'ACTIVE',
                    is_fake_promo = FALSE,
                    is_pinned = EXCLUDED.is_pinned,
                    crawl_time = NOW(),
                    updated_at = NOW()
                """,
                id.toString(), productId.toString(), platformId, platformName, url,
                trustScore, pinned);
    }

    private void insertPriceHistory(UUID listingId, int latestPrice, int originalPrice) {
        int base = latestPrice + 35_000;
        for (int i = 0; i < 8; i++) {
            int price = base - (i + 1) * 4_500;
            if (i == 7) {
                price = latestPrice;
            }
            float disc = originalPrice > 0 ? (1f - (float) price / originalPrice) * 100f : 0f;
            int hoursAgo = (7 - i) * 3;
            String intervalLiteral = hoursAgo + " hours";
            jdbc.update("""
                    INSERT INTO price_record (
                        product_listing_id, price, original_price, discount_pct,
                        in_stock, is_flash_sale, crawled_at
                    )
                    VALUES (
                        CAST(? AS UUID), ?, ?, ?,
                        TRUE, FALSE, NOW() - CAST(? AS INTERVAL)
                    )
                    """,
                    listingId.toString(),
                    price,
                    originalPrice,
                    disc,
                    intervalLiteral);
        }
    }
}
