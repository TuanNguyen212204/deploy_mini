package com.pricehawl.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PriceComparisonResponse {

    private UUID productId;
    private String productName;
    private String productImageUrl;

    private List<PriceComparisonItemResponse> comparisons;
}