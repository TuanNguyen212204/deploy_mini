package com.pricehawl.dto;

import lombok.*;

import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TrendingDealResponse {
    private UUID listingId;
    private UUID productId;
    private String productName;
    private String imageUrl;
    private String platformName;
    private Integer currentPrice;
    private Integer originalPrice;
    private Float discountPercent;
    private Double dealScore;
    private String badge;
    private String explanation;
    private boolean isPinned;

    /** Thành phần điểm (khớp ScoreCalculator / DealScoreCalculation) */
    private Double discountScore;
    private Double trendScore;
    private Double trustScore;
    private Double popularityScore;
    private Double freshnessScore;
}
