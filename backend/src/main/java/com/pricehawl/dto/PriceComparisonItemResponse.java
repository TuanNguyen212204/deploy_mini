package com.pricehawl.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PriceComparisonItemResponse {

    private Integer platformId;
    private String platformName;

    private UUID listingId;
    private String url;
    private String platformImageUrl;

    private Integer price;
    private Integer originalPrice;
    private Float discountPct;

    private Boolean inStock;
    private String promotionLabel;
    private Boolean isFlashSale;

    private LocalDateTime crawledAt;
}