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
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
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

    /** Giới hạn số listing xét trending mỗi lần tính (đủ lớn cho UX, tránh quét full DB). */
    private static final int TRENDING_MAX_CANDIDATE_LISTINGS = 600;

    private final TrendingDealRepository trendingDealRepository;
    private final PriceRecordRepository priceRecordRepository;

    @Cacheable(cacheNames = "trendingDeals", key = "#expand")
    public TrendingDealsSnapshot getTrendingDealsSnapshot(boolean expand) {
        return buildSnapshot(expand);
    }

    private TrendingDealsSnapshot buildSnapshot(boolean expand) {
        Instant computedAt = Instant.now();
        var candidatePage = trendingDealRepository.findTrendingCandidateIds(
                PageRequest.of(
                        0,
                        TRENDING_MAX_CANDIDATE_LISTINGS,
                        Sort.by(Sort.Order.desc("isPinned"), Sort.Order.desc("updatedAt"))));
        List<UUID> candidateIds = candidatePage.getContent();
        if (candidateIds.isEmpty()) {
            return new TrendingDealsSnapshot(
                    List.of(),
                    computedAt,
                    TrendingDealEngine.SNAPSHOT_CACHE_TTL_SECONDS);
        }
        List<ProductListing> candidates =
                trendingDealRepository.findAllWithProductAndPlatformByIdIn(candidateIds);
        Map<UUID, Integer> candidateOrder = new HashMap<>(candidateIds.size());
        for (int i = 0; i < candidateIds.size(); i++) {
            candidateOrder.put(candidateIds.get(i), i);
        }
        candidates.sort(
                Comparator.comparingInt(l -> candidateOrder.getOrDefault(l.getId(), Integer.MAX_VALUE)));

        List<TrendingDealDTO> organicCandidates = new ArrayList<>();

        for (ProductListing listing : candidates) {
            List<PriceRecord> recsDesc = priceRecordRepository
                    .findTop400ByProductListingIdOrderByCrawledAtDesc(listing.getId());

            if (TrendingDealEngine.isEligibleOrganic(listing, recsDesc)) {
                DealScoreCalculation calc = TrendingDealEngine.score(listing, recsDesc);
                PriceRecord latest = TrendingDealEngine.latest(recsDesc);
                organicCandidates.add(new TrendingDealDTO(listing, calc, latest, recsDesc));
            }
        }

        List<TrendingDealDTO> scored = organicCandidates.stream()
                .sorted(trendingSortComparator())
                .toList();

        // --- Dedup theo product (tránh nhiều listing cùng 1 sản phẩm) ---
        Map<UUID, List<TrendingDealDTO>> groupedByProduct = scored.stream()
                .collect(Collectors.groupingBy(d -> d.listing().getProduct().getId()));

        List<TrendingDealDTO> representatives = new ArrayList<>();
        Map<UUID, Boolean> priceConflictByProduct = new HashMap<>();

        for (Map.Entry<UUID, List<TrendingDealDTO>> e : groupedByProduct.entrySet()) {
            UUID productId = e.getKey();
            List<TrendingDealDTO> group = e.getValue();
            priceConflictByProduct.put(productId, hasPriceConflict(group));

            TrendingDealDTO best = group.stream()
                    .max(dedupRepresentativeComparator())
                    .orElse(null);
            if (best != null) {
                representatives.add(best);
            }
        }

        representatives = representatives.stream().sorted(trendingSortComparator()).toList();

        List<TrendingDealResponse> body;
        // Backend luôn trả full danh sách đã chấm điểm (không giới hạn 5),
        // việc hiển thị/pagination để frontend xử lý.
        body = representatives.stream()
                .map(
                        d ->
                                mapToResponse(
                                        d,
                                        priceConflictByProduct.get(
                                                d.listing().getProduct().getId())))
                .toList();

        return new TrendingDealsSnapshot(
                body,
                computedAt,
                TrendingDealEngine.SNAPSHOT_CACHE_TTL_SECONDS);
    }

    private TrendingDealResponse mapToResponse(ProductListing l, DealScoreCalculation calc, PriceRecord latest) {
        Integer currentPrice = latest != null ? latest.getPrice() : null;
        Integer originalPrice = latest != null ? latest.getOriginalPrice() : null;
        float discountPct = latest != null ? (float) TrendingDealEngine.platformDiscountPct(latest) : 0f;
        boolean flashSale = latest != null && Boolean.TRUE.equals(latest.getIsFlashSale());

        boolean pinned = l.getIsPinned() != null && Boolean.TRUE.equals(l.getIsPinned());
        Integer popRaw = l.getProduct() != null ? l.getProduct().getPopularityScore() : null;
        int popularity = popRaw == null ? 0 : popRaw;

        String badge = computeBadge(pinned, popularity, discountPct);

        String explanation = TrendingDealEngine.Explanations.forDeal(l, calc, discountPct, latest);

        return TrendingDealResponse.builder()
                .listingId(l.getId())
                .productId(l.getProduct().getId())
                .productName(l.getProduct().getName())
                .imageUrl(l.getProduct().getImageUrl())
                .platformName(l.getPlatform() != null && l.getPlatform().getName() != null
                        ? l.getPlatform().getName()
                        : (l.getPlatformName() != null ? l.getPlatformName() : ""))
                .currentPrice(currentPrice)
                .originalPrice(originalPrice)
                .discountPercent(discountPct)
                .isFlashSale(flashSale)
                .dealScore(calc.totalDealScore())
                .badge(badge)
                .explanation(explanation)
                .isPinned(pinned)
                .discountScore(calc.discountScore())
                .trustScore(calc.trustScore())
                .popularityScore(calc.popularityScore())
                .freshnessScore(calc.freshnessScore())
                .build();
    }

    private TrendingDealResponse mapToResponse(TrendingDealDTO dto, Boolean priceConflict) {
        TrendingDealResponse res =
                mapToResponse(dto.listing(), dto.score(), dto.latestPriceRecord());
        boolean conflict = Boolean.TRUE.equals(priceConflict);
        res.setPriceConflict(conflict);
        res.setPriceConflictMessage(conflict ? "Có chênh lệch giá giữa các shop/sàn" : null);
        if (res.getExplanation() == null || res.getExplanation().trim().length() < TrendingDealEngine.MIN_EXPLANATION_LENGTH) {
            res.setExplanation((res.getExplanation() == null ? "" : res.getExplanation().trim())
                    + " Có chênh lệch giá giữa các shop/sàn, hãy so sánh kỹ trước khi mua.");
        }
        return res;
    }

    private static String computeBadge(boolean pinned, int popularityScore, float discountPct) {
        if (pinned) {
            return "PINNED";
        }
        if (popularityScore == 100) {
            return "TRENDING";
        }
        if (popularityScore >= 80 && popularityScore < 100) {
            return "HOT";
        }
        if (discountPct > 20f) {
            return "DEAL";
        }
        // fallback an toàn để UI có nhãn mặc định
        return "TRENDING";
    }

    private static Comparator<TrendingDealDTO> dedupRepresentativeComparator() {
        return Comparator
                .comparingDouble((TrendingDealDTO d) -> d.listing() != null && d.listing().getTrustScore() != null
                        ? d.listing().getTrustScore()
                        : 0.0)
                .thenComparingInt(d -> {
                    PriceRecord latest = d.latestPriceRecord();
                    Integer p = latest != null ? latest.getPrice() : null;
                    return p == null ? Integer.MAX_VALUE : p;
                });
    }

    private static Comparator<TrendingDealDTO> trendingSortComparator() {
        return Comparator
                // isPinned: true lên trước
                .comparing((TrendingDealDTO d) -> d.listing() != null && Boolean.TRUE.equals(d.listing().getIsPinned()),
                        Comparator.reverseOrder())
                // discountPct cao hơn (ưu tiên trước)
                .thenComparing((TrendingDealDTO d) -> {
                    PriceRecord latest = d.latestPriceRecord();
                    if (latest == null) return 0.0;
                    return TrendingDealEngine.platformDiscountPct(latest);
                }, Comparator.reverseOrder())
                // nếu cùng discountPct, ưu tiên flash sale
                .thenComparing((TrendingDealDTO d) -> {
                    PriceRecord latest = d.latestPriceRecord();
                    return latest != null && Boolean.TRUE.equals(latest.getIsFlashSale());
                }, Comparator.reverseOrder())
                // totalDealScore cao hơn
                .thenComparing((TrendingDealDTO d) -> d.score().totalDealScore(), Comparator.reverseOrder())
                // discountScore cao hơn
                .thenComparing((TrendingDealDTO d) -> d.score().discountScore(), Comparator.reverseOrder())
                // trustScore cao hơn
                .thenComparing((TrendingDealDTO d) -> d.score().trustScore(), Comparator.reverseOrder())
                // nếu cùng sản phẩm, ưu tiên price thấp hơn
                .thenComparing(d -> {
                    PriceRecord latest = d.latestPriceRecord();
                    Integer p = latest != null ? latest.getPrice() : null;
                    return p == null ? Integer.MAX_VALUE : p;
                });
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
