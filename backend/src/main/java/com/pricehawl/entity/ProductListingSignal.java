package com.pricehawl.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Bảng phụ lưu "tín hiệu" cho Trending Deals mà không cần sửa entity ProductListing.
 * Mục tiêu: hạn chế conflict khi merge DB và giữ ProductListing tối giản theo team.
 */
@Entity
@Table(name = "product_listing_signal")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProductListingSignal {

    @Id
    @Column(name = "listing_id", nullable = false)
    private UUID listingId;

    @Column(name = "trust_score", nullable = false)
    @Builder.Default
    private Double trustScore = 0.60;

    @Column(name = "status", nullable = false, length = 20)
    @Builder.Default
    private String status = "ACTIVE";

    @Column(name = "is_hijacked", nullable = false)
    @Builder.Default
    private Boolean isHijacked = false;

    @Column(name = "is_fake_promo", nullable = false)
    @Builder.Default
    private Boolean isFakePromo = false;

    @Column(name = "is_pinned", nullable = false)
    @Builder.Default
    private Boolean isPinned = false;

    @Column(name = "crawl_time")
    private LocalDateTime crawlTime;
}

