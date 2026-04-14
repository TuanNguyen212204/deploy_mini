package com.pricehawl.service;

import com.pricehawl.dto.TrendingDealModels.DealScoreCalculation;
import com.pricehawl.dto.TrendingDealModels.TrendingDealDTO;
import com.pricehawl.dto.TrendingDealModels.TrendingDealResponse;
import com.pricehawl.dto.TrendingDealModels.TrendingDealsSnapshot;
import com.pricehawl.entity.PriceRecord;
import com.pricehawl.entity.ProductListing;
import com.pricehawl.repository.TrendingDealRepositories.PriceRecordRepository;
import com.pricehawl.repository.TrendingDealRepositories.TrendingDealRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class TrendingDealService {

    private final TrendingDealRepository trendingDealRepository;
    private final PriceRecordRepository priceRecordRepository;

    @Cacheable(cacheNames = "trendingDeals", key = "#expand")
    public TrendingDealsSnapshot getTrendingDealsSnapshot(boolean expand) {
        return buildSnapshot(expand);
    }

    private TrendingDealsSnapshot buildSnapshot(boolean expand) {
        Instant computedAt = Instant.now();
        List<ProductListing> candidates = trendingDealRepository.findTrendingCandidates();
        List<TrendingDealDTO> organicCandidates = new ArrayList<>();

        for (ProductListing listing : candidates) {
            List<PriceRecord> recsDesc = priceRecordRepository
                    .findByProductListingIdOrderByCrawledAtDesc(listing.getId());

            if (TrendingDealEngine.isEligibleOrganic(listing, recsDesc)) {
                DealScoreCalculation calc = TrendingDealEngine.score(listing, recsDesc);
                PriceRecord latest = TrendingDealEngine.latest(recsDesc);
                organicCandidates.add(new TrendingDealDTO(listing, calc, latest, recsDesc));
            }
        }

        List<TrendingDealDTO> scored = organicCandidates.stream()
                .sorted(Comparator.comparing((TrendingDealDTO d) -> d.score().totalDealScore(), Comparator.reverseOrder()))
                .toList();

        Map<UUID, List<TrendingDealDTO>> groupedByProduct = scored.stream()
                .collect(Collectors.groupingBy(d -> d.listing().getProduct().getId()));

        List<TrendingDealDTO> organicRepresentatives = new ArrayList<>();
        Map<UUID, Boolean> priceConflictByProduct = new HashMap<>();

        for (Map.Entry<UUID, List<TrendingDealDTO>> e : groupedByProduct.entrySet()) {
            UUID productId = e.getKey();
            List<TrendingDealDTO> group = e.getValue();

            priceConflictByProduct.put(productId, hasPriceConflict(group));

            TrendingDealDTO bestOrganic = group.stream()
                    .max(Comparator.comparing(d -> d.score().totalDealScore()))
                    .orElse(null);
            if (bestOrganic != null) {
                organicRepresentatives.add(bestOrganic); // AC-05
            }
        }

        organicRepresentatives = organicRepresentatives.stream()
                .sorted(Comparator.comparing(d -> d.score().totalDealScore(), Comparator.reverseOrder()))
                .toList();

        List<TrendingDealDTO> finalList = organicRepresentatives;

        List<TrendingDealResponse> body;
        if (expand) {
            body = scored.stream()
                    .map(d -> mapToResponse(d, priceConflictByProduct.get(d.listing().getProduct().getId())))
                    .toList();
        } else {
            body = finalList.stream()
                    .map(d -> mapToResponse(d, priceConflictByProduct.get(d.listing().getProduct().getId())))
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
        List<PriceRecord> recsDesc = priceRecordRepository
                .findByProductListingIdOrderByCrawledAtDesc(l.getId());
        PriceRecord latest = TrendingDealEngine.latest(recsDesc);
        TrendingDealEngine.HistoricalDiscountResult hist = TrendingDealEngine.computeHistoricalDiscount(recsDesc);
        float realDiscount = hist.discountPercent();

        String badge = calc.totalDealScore() > 0.75 ? "HOT" : "TRENDING";

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
                .isPinned(false)
                .discountScore(calc.discountScore())
                .trendScore(calc.trendScore())
                .trustScore(calc.trustScore())
                .popularityScore(calc.popularityScore())
                .freshnessScore(calc.freshnessScore())
                .build();
    }

    private TrendingDealResponse mapToResponse(TrendingDealDTO dto, Boolean priceConflict) {
        TrendingDealResponse res = mapToResponse(dto.listing(), dto.score());
        res.setPinned(false);
        boolean conflict = Boolean.TRUE.equals(priceConflict);
        res.setPriceConflict(conflict);
        res.setPriceConflictMessage(conflict ? "Có chênh lệch giá giữa các shop/sàn" : null);
        if (res.getExplanation() == null || res.getExplanation().trim().length() < TrendingDealEngine.MIN_EXPLANATION_LENGTH) {
            res.setExplanation((res.getExplanation() == null ? "" : res.getExplanation().trim())
                    + " Có chênh lệch giá giữa các shop/sàn, hãy so sánh kỹ trước khi mua.");
        }
        return res;
    }

    private static boolean hasPriceConflict(List<TrendingDealDTO> group) {
        if (group == null || group.size() < 2) {
            return false;
        }
        List<Integer> prices = group.stream()
                .map(TrendingDealDTO::latestPriceRecord)
                .filter(Objects::nonNull)
                .map(PriceRecord::getPrice)
                .filter(Objects::nonNull)
                .filter(p -> p > 0)
                .distinct()
                .sorted()
                .toList();
        if (prices.size() < 2) {
            return false;
        }
        int min = prices.get(0);
        int max = prices.get(prices.size() - 1);
        if (min <= 0) {
            return false;
        }
        double diffPct = (max - min) / (double) min * 100.0;
        return diffPct >= 7.0; // heuristic cho "chênh lệch đáng kể"
    }
}
