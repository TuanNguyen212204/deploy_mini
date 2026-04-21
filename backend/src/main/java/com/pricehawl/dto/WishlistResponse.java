package com.pricehawl.dto;

import java.util.UUID;
import java.time.LocalDateTime;

public interface WishlistResponse {
    UUID getWishlistId();
    UUID getProductId();
    String getProductName();
    String getBrandName();
    /**
     * Ảnh theo listing/sàn (có thể NULL).
     * Giữ field cũ để tương thích UI hiện tại.
     */
    String getImageUrl();

    /** Ảnh chính của sản phẩm (ưu tiên fallback khi imageUrl null). */
    String getProductImageUrl();

    /** Ảnh theo listing/sàn (rõ nghĩa hơn imageUrl). */
    String getPlatformImageUrl();
    Integer getMinPrice();
    String getPlatformName();
    LocalDateTime getAddedAt();
}