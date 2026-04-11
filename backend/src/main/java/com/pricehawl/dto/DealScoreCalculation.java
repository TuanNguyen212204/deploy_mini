package com.pricehawl.dto;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DealScoreCalculation {
    private double discountScore;
    private double trendScore;
    private double trustScore;
    private double popularityScore;
    private double freshnessScore;
    private double totalDealScore;
}
