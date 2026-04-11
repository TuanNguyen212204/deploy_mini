package com.pricehawl.service;

import com.pricehawl.dto.DealScoreCalculation;
import com.pricehawl.dto.TrendingDealResponse;
import com.pricehawl.entity.ProductListing;
import com.pricehawl.repository.ProductListingRepository;
import com.pricehawl.util.ScoreCalculator;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class TrendingDealService {

    private final ProductListingRepository repository;

    public List<TrendingDealResponse> getTrendingDeals(boolean expand) {
        List<ProductListing> candidates = repository.findValidListingsForTrending();

        List<ProductListing> validListings = candidates.stream()
                .filter(listing -> {
                    var latest = listing.getLatestPriceRecord();
                    return latest != null && Boolean.TRUE.equals(latest.getInStock());
                })
                .toList();

        Map<ProductListing, DealScoreCalculation> scoreMap = validListings.stream()
                .collect(Collectors.toMap(l -> l, ScoreCalculator::calculate));

        Map<UUID, List<ProductListing>> groupedByProduct = validListings.stream()
                .collect(Collectors.groupingBy(l -> l.getProduct().getId()));

        List<ProductListing> representatives = groupedByProduct.values().stream()
                .map(group -> group.stream()
                        .max(Comparator.comparing(l -> scoreMap.get(l).getTotalDealScore()))
                        .orElse(null))
                .filter(Objects::nonNull)
                .toList();

        List<ProductListing> pinned = representatives.stream()
                .filter(ProductListing::getIsPinned)
                .sorted(Comparator.comparing(l -> scoreMap.get(l).getTotalDealScore()).reversed())
                .toList();

        List<ProductListing> nonPinned = representatives.stream()
                .filter(l -> !Boolean.TRUE.equals(l.getIsPinned()))
                .sorted(Comparator.comparing(l -> scoreMap.get(l).getTotalDealScore()).reversed())
                .toList();

        List<ProductListing> finalList = new ArrayList<>();
        finalList.addAll(pinned);
        finalList.addAll(nonPinned);

        if (expand) {
            return validListings.stream()
                    .map(l -> mapToResponse(l, scoreMap.get(l)))
                    .toList();
        }

        return finalList.stream()
                .map(l -> mapToResponse(l, scoreMap.get(l)))
                .toList();
    }

    private TrendingDealResponse mapToResponse(ProductListing l, DealScoreCalculation calc) {
        var latest = l.getLatestPriceRecord();
        float discountPct = latest != null && latest.getOriginalPrice() != null
                ? latest.getDiscountPct() != null ? latest.getDiscountPct() : 0f
                : 0f;

        String badge = Boolean.TRUE.equals(l.getIsPinned()) ? "PINNED"
                : calc.getTotalDealScore() > 0.75 ? "HOT" : "TRENDING";

        String explanation = String.format("Giảm %.0f%% • Trend mạnh • Fresh <2h", discountPct);

        return TrendingDealResponse.builder()
                .listingId(l.getId())
                .productId(l.getProduct().getId())
                .productName(l.getProduct().getName())
                .imageUrl(l.getProduct().getImageUrl())
                .platformName(l.getPlatform().getName())
                .currentPrice(latest != null ? latest.getPrice() : 0)
                .originalPrice(latest != null ? latest.getOriginalPrice() : 0)
                .discountPercent(discountPct)
                .dealScore(calc.getTotalDealScore())
                .badge(badge)
                .explanation(explanation)
                .isPinned(Boolean.TRUE.equals(l.getIsPinned()))
                .discountScore(calc.getDiscountScore())
                .trendScore(calc.getTrendScore())
                .trustScore(calc.getTrustScore())
                .popularityScore(calc.getPopularityScore())
                .freshnessScore(calc.getFreshnessScore())
                .build();
    }
}
