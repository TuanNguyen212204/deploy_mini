package com.pricehawl.service;

import com.pricehawl.dto.TrendingDealModels.DealScoreCalculation;
import com.pricehawl.dto.TrendingDealModels.TrendingDealDTO;
import com.pricehawl.dto.TrendingDealModels.TrendingDealResponse;
import com.pricehawl.dto.TrendingDealModels.TrendingDealsSnapshot;
import com.pricehawl.entity.PriceRecord;
import com.pricehawl.entity.ProductListing;
import com.pricehawl.entity.ProductListingSignal;
import com.pricehawl.repository.TrendingDealRepositories.PriceRecordRepository;
import com.pricehawl.repository.TrendingDealRepositories.ProductListingSignalRepository;
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
    private final ProductListingSignalRepository productListingSignalRepository;

    @Cacheable(cacheNames = "trendingDeals", key = "#expand")
    public TrendingDealsSnapshot getTrendingDealsSnapshot(boolean expand) {
        return buildSnapshot(expand);
    }

    private TrendingDealsSnapshot buildSnapshot(boolean expand) {
        Instant computedAt = Instant.now();
        List<ProductListing> candidates = trendingDealRepository.findTrendingCandidates();

        List<UUID> listingIds = candidates.stream().map(ProductListing::getId).toList();
        Map<UUID, ProductListingSignal> signals = productListingSignalRepository.findByListingIdIn(listingIds)
                .stream()
                .collect(Collectors.toMap(ProductListingSignal::getListingId, s -> s));

        List<TrendingDealDTO> pinnedCandidates = new ArrayList<>();
        List<TrendingDealDTO> organicCandidates = new ArrayList<>();

        for (ProductListing listing : candidates) {
            ProductListingSignal signal = signals.get(listing.getId());
            List<PriceRecord> recsDesc = priceRecordRepository
                    .findByProductListingIdOrderByCrawledAtDesc(listing.getId());

            if (TrendingDealEngine.isEligiblePinned(listing, signal, recsDesc)) {
                DealScoreCalculation calc = TrendingDealEngine.score(listing, signal, recsDesc);
                PriceRecord latest = TrendingDealEngine.latest(recsDesc);
                pinnedCandidates.add(new TrendingDealDTO(listing, calc, latest, recsDesc, signal));
                continue;
            }
            if (TrendingDealEngine.isEligibleOrganic(listing, signal, recsDesc)) {
                DealScoreCalculation calc = TrendingDealEngine.score(listing, signal, recsDesc);
                PriceRecord latest = TrendingDealEngine.latest(recsDesc);
                organicCandidates.add(new TrendingDealDTO(listing, calc, latest, recsDesc, signal));
            }
        }

        List<TrendingDealDTO> scored = new ArrayList<>(pinnedCandidates.size() + organicCandidates.size());
        scored.addAll(pinnedCandidates);
        scored.addAll(organicCandidates);

        Map<UUID, List<TrendingDealDTO>> groupedByProduct = scored.stream()
                .collect(Collectors.groupingBy(d -> d.listing().getProduct().getId()));

        List<TrendingDealDTO> pinnedRepresentatives = new ArrayList<>();
        List<TrendingDealDTO> organicRepresentatives = new ArrayList<>();
        Map<UUID, Boolean> priceConflictByProduct = new HashMap<>();

        for (Map.Entry<UUID, List<TrendingDealDTO>> e : groupedByProduct.entrySet()) {
            UUID productId = e.getKey();
            List<TrendingDealDTO> group = e.getValue();

            priceConflictByProduct.put(productId, hasPriceConflict(group));

            TrendingDealDTO pinned = group.stream()
                    .filter(d -> d.signal() != null && Boolean.TRUE.equals(d.signal().getIsPinned()))
                    .max(Comparator.comparing(d -> d.score().totalDealScore()))
                    .orElse(null);

            if (pinned != null) {
                pinnedRepresentatives.add(pinned); // AC-04, AC-05
                continue;
            }

            TrendingDealDTO bestOrganic = group.stream()
                    .max(Comparator.comparing(d -> d.score().totalDealScore()))
                    .orElse(null);
            if (bestOrganic != null) {
                organicRepresentatives.add(bestOrganic); // AC-05
            }
        }

        pinnedRepresentatives = pinnedRepresentatives.stream()
                .sorted(Comparator.comparing(d -> d.score().totalDealScore(), Comparator.reverseOrder()))
                .toList();
        organicRepresentatives = organicRepresentatives.stream()
                .sorted(Comparator.comparing(d -> d.score().totalDealScore(), Comparator.reverseOrder()))
                .toList();

        List<TrendingDealDTO> representatives = new ArrayList<>(pinnedRepresentatives.size() + organicRepresentatives.size());
        representatives.addAll(pinnedRepresentatives);
        representatives.addAll(organicRepresentatives);

        List<TrendingDealDTO> finalList = representatives;

        List<TrendingDealResponse> body;
        if (expand) {
            body = scored.stream()
                    .sorted(Comparator
                            .comparing((TrendingDealDTO d) -> d.signal() == null || !Boolean.TRUE.equals(d.signal().getIsPinned()))
                            .thenComparing(d -> d.score().totalDealScore(), Comparator.reverseOrder()))
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
        boolean pinned = dto.signal() != null && Boolean.TRUE.equals(dto.signal().getIsPinned());
        res.setPinned(pinned);
        res.setBadge(pinned ? "PINNED" : res.getBadge());
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
