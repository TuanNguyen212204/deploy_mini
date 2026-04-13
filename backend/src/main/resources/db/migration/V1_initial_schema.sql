-- ============================================================
-- PriceHawk — V1_initial_schema.sql
-- Chạy một lần duy nhất khi khởi động lần đầu qua Flyway
-- PostgreSQL / Supabase
-- ============================================================

-- ------------------------------------------------------------
-- 1.1  platform — bảng tĩnh, seed sẵn 3 sàn
-- ------------------------------------------------------------
CREATE TABLE platform (
                          id        INT          PRIMARY KEY,
                          name      VARCHAR(100) NOT NULL,
                          base_url  VARCHAR(255),
                          logo_url  VARCHAR(500),
                          is_active BOOLEAN      NOT NULL DEFAULT TRUE
);

INSERT INTO platform (id, name, base_url, logo_url, is_active) VALUES
                                                                   (1, 'Cocolux',  'https://cocolux.com',       NULL, TRUE),
                                                                   (2, 'Guardian', 'https://guardian.com.vn',   NULL, TRUE),
                                                                   (3, 'Hasaki',   'https://hasaki.vn',          NULL, TRUE);

-- ------------------------------------------------------------
-- 1.2  brand
-- ------------------------------------------------------------
CREATE TABLE brand (
                       id                SERIAL       PRIMARY KEY,
                       name              VARCHAR(200) NOT NULL UNIQUE,
                       slug              VARCHAR(200) NOT NULL UNIQUE,
                       country_of_origin VARCHAR(10)
);

-- ------------------------------------------------------------
-- 1.3  category — cây tự tham chiếu qua parent_id
-- ------------------------------------------------------------
CREATE TABLE category (
                          id        SERIAL       PRIMARY KEY,
                          name      VARCHAR(200) NOT NULL UNIQUE,
                          slug      VARCHAR(200) NOT NULL,
                          parent_id INT          REFERENCES category(id) ON DELETE SET NULL
);

-- ------------------------------------------------------------
-- 2.1  product — sản phẩm chuẩn hoá, độc lập với sàn
-- ------------------------------------------------------------
CREATE TABLE product (
                         id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
                         name        VARCHAR(500) NOT NULL UNIQUE,
                         category_id INT          NOT NULL REFERENCES category(id),
                         brand_id    INT          NOT NULL REFERENCES brand(id),
                         barcode     VARCHAR(100),
                         description TEXT,
                         image_url   VARCHAR(500),
                         skin_type   VARCHAR(100),
                         volume_ml   VARCHAR(50),
                         attributes  JSONB,
                         popularity_score INT NOT NULL DEFAULT 0,
                         created_at  TIMESTAMP    NOT NULL DEFAULT NOW(),
                         updated_at  TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- Full-text search index trên tên sản phẩm
CREATE INDEX idx_product_name_gin
    ON product USING GIN (to_tsvector('simple', name));

-- ------------------------------------------------------------
-- 2.2  product_listing — 1 sản phẩm × 1 sàn = 1 listing
-- ------------------------------------------------------------
CREATE TABLE product_listing (
                                 id                 UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
                                 product_id         UUID          NOT NULL REFERENCES product(id)  ON DELETE CASCADE,
                                 platform_id        INT           NOT NULL REFERENCES platform(id),
                                 platform_name      VARCHAR(500)  NOT NULL,
                                 url                VARCHAR(1000) NOT NULL UNIQUE,
                                 platform_image_url VARCHAR(500),
                                 trust_score        DOUBLE PRECISION NOT NULL DEFAULT 0,
                                 status             VARCHAR(20)      NOT NULL DEFAULT 'ACTIVE',
                                 is_fake_promo      BOOLEAN          NOT NULL DEFAULT FALSE,
                                 is_pinned          BOOLEAN          NOT NULL DEFAULT FALSE,
                                 crawl_time         TIMESTAMP,
                                 updated_at         TIMESTAMP     NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_product_listing_product_id
    ON product_listing(product_id);

-- ------------------------------------------------------------
-- 3.1  price_record — append-only, không UPDATE/DELETE
-- ------------------------------------------------------------
CREATE TABLE price_record (
                              id                 BIGSERIAL  PRIMARY KEY,
                              product_listing_id UUID       NOT NULL REFERENCES product_listing(id) ON DELETE CASCADE,
                              price              INT        NOT NULL,
                              original_price     INT,
                              discount_pct       FLOAT,
                              in_stock           BOOLEAN    NOT NULL DEFAULT TRUE,
                              promotion_label    VARCHAR(255),
                              is_flash_sale      BOOLEAN    NOT NULL DEFAULT FALSE,
                              crawled_at         TIMESTAMP  NOT NULL DEFAULT NOW()
);

-- Index chính: lịch sử giá theo listing
CREATE INDEX idx_price_record_listing_crawled
    ON price_record(product_listing_id, crawled_at DESC);

-- Index phụ: giá mới nhất toàn hệ thống
CREATE INDEX idx_price_record_crawled
    ON price_record(crawled_at DESC);

-- ------------------------------------------------------------
-- 4.1  users
-- ------------------------------------------------------------
CREATE TABLE users (
                       id         UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
                       email      VARCHAR(255) NOT NULL UNIQUE,
                       name       VARCHAR(255) NOT NULL,
                       plan       VARCHAR(20)  NOT NULL DEFAULT 'free'
                           CHECK (plan IN ('free', 'premium')),
                       phone      VARCHAR(20),
                       created_at TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------
-- 4.2  price_alert — gắn vào product (không phải listing)
-- ------------------------------------------------------------
CREATE TABLE price_alert (
                             id           UUID      PRIMARY KEY DEFAULT gen_random_uuid(),
                             user_id      UUID      NOT NULL REFERENCES users(id)    ON DELETE CASCADE,
                             product_id   UUID      NOT NULL REFERENCES product(id)  ON DELETE CASCADE,
                             platform_id  INT       REFERENCES platform(id),   -- NULL = tất cả sàn
                             target_price INT       NOT NULL,
                             is_active    BOOLEAN   NOT NULL DEFAULT TRUE,
                             notified_at  TIMESTAMP,
                             created_at   TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Index cho scheduler kiểm tra alert theo giá
CREATE INDEX idx_price_alert_active
    ON price_alert(product_id, target_price)
    WHERE is_active = TRUE;

-- ------------------------------------------------------------
-- 4.3  wishlist
-- ------------------------------------------------------------
CREATE TABLE wishlist (
                          id         UUID      PRIMARY KEY DEFAULT gen_random_uuid(),
                          user_id    UUID      NOT NULL REFERENCES users(id)   ON DELETE CASCADE,
                          product_id UUID      NOT NULL REFERENCES product(id) ON DELETE CASCADE,
                          added_at   TIMESTAMP NOT NULL DEFAULT NOW(),
                          UNIQUE (user_id, product_id)
);

-- ------------------------------------------------------------
-- Trigger: tự cập nhật updated_at khi UPDATE
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_product_updated_at
    BEFORE UPDATE ON product
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_product_listing_updated_at
    BEFORE UPDATE ON product_listing
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();