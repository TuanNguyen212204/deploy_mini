-- ============================================================
-- PriceHawk — Trending Deals schema (V2)
-- Mục tiêu:
-- - Bổ sung popularity_score cho Product (scoring)
-- - Tạo bảng phụ product_listing_signal cho các tín hiệu nghiệp vụ:
--   trust_score, status, hijacked, fake_promo, pinned, crawl_time
-- Lưu ý: dùng IF NOT EXISTS để giảm rủi ro merge/chạy lại.
-- ============================================================

-- 1) Product popularity_score (phục vụ popularity signal)
ALTER TABLE product
    ADD COLUMN IF NOT EXISTS popularity_score INT NOT NULL DEFAULT 0;

-- 2) Listing signals (không sửa product_listing)
CREATE TABLE IF NOT EXISTS product_listing_signal (
    listing_id    UUID PRIMARY KEY REFERENCES product_listing(id) ON DELETE CASCADE,
    trust_score   DOUBLE PRECISION NOT NULL DEFAULT 0.60,
    status        VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    is_hijacked   BOOLEAN NOT NULL DEFAULT FALSE,
    is_fake_promo BOOLEAN NOT NULL DEFAULT FALSE,
    is_pinned     BOOLEAN NOT NULL DEFAULT FALSE,
    crawl_time    TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_pl_signal_status
    ON product_listing_signal(status);

CREATE INDEX IF NOT EXISTS idx_pl_signal_pinned
    ON product_listing_signal(is_pinned);

