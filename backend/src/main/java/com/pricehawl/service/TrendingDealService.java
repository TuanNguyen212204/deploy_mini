package com.pricehawl.service;

import com.pricehawl.dto.TrendingDealModels.DealScoreCalculation;
import com.pricehawl.dto.TrendingDealModels.TrendingDealDTO;
import com.pricehawl.dto.TrendingDealModels.TrendingDealResponse;
import com.pricehawl.dto.TrendingDealModels.TrendingDealsSnapshot;
import com.pricehawl.entity.PriceRecord;
import com.pricehawl.entity.ProductListing;
import com.pricehawl.repository.TrendingDealRepositories.TrendingDealRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class TrendingDealService {

    private final TrendingDealRepository trendingDealRepository;

    @Cacheable(cacheNames = "trendingDeals", key = "#expand")
    public TrendingDealsSnapshot getTrendingDealsSnapshot(boolean expand) {
        return buildSnapshot(expand);
    }

    private TrendingDealsSnapshot buildSnapshot(boolean expand) {
        Instant computedAt = Instant.now();
        List<ProductListing> candidates = trendingDealRepository.findTrendingCandidates();

        List<ProductListing> validListings = candidates.stream()
                .filter(TrendingDealEngine::isEligibleForTrending)
                .toList();

        List<TrendingDealDTO> scored = validListings.stream()
                .map(l -> new TrendingDealDTO(l, TrendingDealEngine.score(l)))
                .toList();

        Map<UUID, List<TrendingDealDTO>> groupedByProduct = scored.stream()
                .collect(Collectors.groupingBy(d -> d.listing().getProduct().getId()));

        List<TrendingDealDTO> representatives = groupedByProduct.values().stream()
                .map(group -> group.stream()
                        .max(Comparator.comparing(d -> d.score().totalDealScore()))
                        .orElse(null))
                .filter(Objects::nonNull)
                .toList();

        List<TrendingDealDTO> pinned = representatives.stream()
                .filter(d -> Boolean.TRUE.equals(d.listing().getIsPinned()))
                .sorted(Comparator.comparing(d -> d.score().totalDealScore(), Comparator.reverseOrder()))
                .toList();

        List<TrendingDealDTO> nonPinned = representatives.stream()
                .filter(d -> !Boolean.TRUE.equals(d.listing().getIsPinned()))
                .sorted(Comparator.comparing(d -> d.score().totalDealScore(), Comparator.reverseOrder()))
                .toList();

        List<TrendingDealDTO> finalList = new ArrayList<>();
        finalList.addAll(pinned);
        finalList.addAll(nonPinned);

        List<TrendingDealResponse> body;
        if (expand) {
            body = scored.stream()
                    .sorted(Comparator
                            .comparing((TrendingDealDTO d) -> !Boolean.TRUE.equals(d.listing().getIsPinned()))
                            .thenComparing(d -> d.score().totalDealScore(), Comparator.reverseOrder()))
                    .map(this::mapToResponse)
                    .toList();
        } else {
            body = finalList.stream()
                    .map(this::mapToResponse)
                    .toList();
        }

        return new TrendingDealsSnapshot(
                body,
                computedAt,
                TrendingDealEngine.SNAPSHOT_CACHE_TTL_SECONDS);
    }

    private TrendingDealResponse mapToResponse(TrendingDealDTO dto) {
        return mapToResponse(dto.listing(), dto.score());
    }

    private TrendingDealResponse mapToResponse(ProductListing l, DealScoreCalculation calc) {
        PriceRecord latest = l.getLatestPriceRecord();
        TrendingDealEngine.HistoricalDiscountResult hist = TrendingDealEngine.computeHistoricalDiscount(l);
        float realDiscount = hist.discountPercent();

        String badge = Boolean.TRUE.equals(l.getIsPinned()) ? "PINNED"
                : calc.totalDealScore() > 0.75 ? "HOT" : "TRENDING";

        String explanation = TrendingDealEngine.Explanations.forDeal(l, calc, realDiscount, latest);

        return TrendingDealResponse.builder()
                .listingId(l.getId())
                .productId(l.getProduct().getId())
                .productName(l.getProduct().getName())
                .imageUrl(l.getProduct().getImageUrl())
                .platformName(l.getPlatform().getName())
                .currentPrice(hist.currentPrice())
                .originalPrice(hist.referencePrice())
                .discountPercent(realDiscount)
                .dealScore(calc.totalDealScore())
                .badge(badge)
                .explanation(explanation)
                .isPinned(Boolean.TRUE.equals(l.getIsPinned()))
                .discountScore(calc.discountScore())
                .trendScore(calc.trendScore())
                .trustScore(calc.trustScore())
                .popularityScore(calc.popularityScore())
                .freshnessScore(calc.freshnessScore())
                .build();
    }
}
