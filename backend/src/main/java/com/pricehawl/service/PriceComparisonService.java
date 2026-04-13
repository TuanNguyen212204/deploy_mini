package com.pricehawl.service;

import com.pricehawl.dto.PriceComparisonResponse;

import java.util.UUID;

public interface PriceComparisonService {

    PriceComparisonResponse compareByProductId(UUID productId);
}