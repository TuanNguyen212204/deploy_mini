package com.pricehawl.service;

import com.pricehawl.dto.TrendingDealModels.DealScoreCalculation;
import com.pricehawl.dto.TrendingDealModels.TrendingDealDTO;
import com.pricehawl.dto.TrendingDealModels.TrendingDealResponse;
import com.pricehawl.dto.TrendingDealModels.TrendingDealsSnapshot;
import com.pricehawl.entity.PriceRecord;
import com.pricehawl.entity.ProductListing;
import com.pricehawl.exception.TrendingDealsComputationException;
import com.pricehawl.repository.TrendingDealRepositories.PriceRecordRepository;
import com.pricehawl.repository.TrendingDealRepositories.TrendingDealRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Slice;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Service
@RequiredArgsConstructor
public class TrendingDealService {

    private static final int TRENDING_CANDIDATE_SLICE_SIZE = 400;
    private static final int TRENDING_MAX_CANDIDATES_SCAN = 2400;
    private static final int TRENDING_PRICE_RECORDS_PER_LISTING = 80;
    private static final int MAX_TRENDING_DEALS_RETURN = 100;

    private final TrendingDealRepository trendingDealRepository;
    private final PriceRecordRepository priceRecordRepository;

    public TrendingDealsSnapshot getTrendingDealsSnapshot(boolean expand, boolean refresh) {
        return refresh ? computeNowAndStore(expand) : getOrWarmNonBlocking(expand);
    }

    private static final class Holder {
        volatile TrendingDealsSnapshot snapshot;
        volatile Instant expiresAt;
        volatile CompletableFuture<Void> inFlight;
    }

    private final ConcurrentHashMap<Boolean, Holder> byExpand = new ConcurrentHashMap<>();

    private Holder holder(boolean expand) {
        return byExpand.computeIfAbsent(expand, _k -> new Holder());
    }

    private TrendingDealsSnapshot getOrWarmNonBlocking(boolean expand) {
        Holder h = holder(expand);
        TrendingDealsSnapshot snap = h.snapshot;
        Instant now = Instant.now();

        if (snap != null && h.expiresAt != null && now.isBefore(h.expiresAt)) {
            return snap;
        }

        triggerWarmIfNeeded(expand, h);

        if (snap != null) {
            return snap;
        }

        throw new TrendingDealsComputationException(
                "Trending deals đang khởi tạo trên server (warm-up). Vui lòng thử lại sau vài giây.");
    }

    private void triggerWarmIfNeeded(boolean expand, Holder h) {
        CompletableFuture<Void> existing = h.inFlight;
        if (existing != null && !existing.isDone()) {
            return;
        }
        synchronized (h) {
            CompletableFuture<Void> inflight = h.inFlight;
            if (inflight != null && !inflight.isDone()) {
                return;
            }
            h.inFlight = CompletableFuture.runAsync(() -> {
                try {
                    TrendingDealsSnapshot fresh = buildSnapshot(expand);
                    h.snapshot = fresh;
                    h.expiresAt = fresh.computedAt().plusSeconds(fresh.cacheTtlSeconds());
                } catch (RuntimeException ex) {
                    log.error("Async trending warm-up failed (expand={})", expand, ex);
                }
            });
        }
    }

    private TrendingDealsSnapshot computeNowAndStore(boolean expand) {
        Holder h = holder(expand);
        TrendingDealsSnapshot fresh = buildSnapshot(expand);
        h.snapshot = fresh;
        h.expiresAt = fresh.computedAt().plusSeconds(fresh.cacheTtlSeconds());
        return fresh;
    }

    private TrendingDealsSnapshot buildSnapshot(boolean expand) {
        try {
            return buildSnapshotUnsafe(expand);
        } catch (TrendingDealsComputationException e) {
            throw e;
        } catch (RuntimeException e) {
            log.error("Trending snapshot computation failed (expand={})", expand, e);
            throw new TrendingDealsComputationException(
                    "Hệ thống đang cập nhật dữ liệu trending, vui lòng thử lại sau.", e);
        }
    }

    private TrendingDealsSnapshot buildSnapshotUnsafe(boolean expand) {
        Instant computedAt = Instant.now();
        LocalDateTime priceSince = LocalDateTime.now()
                .minusDays(TrendingDealEngine.PRICE_LOOKBACK_DAYS_FOR_CANDIDATE_EXISTS);

        Map<UUID, TrendingDealDTO> bestByProduct = new HashMap<>();
        Map<UUID, PriceConflictStats> priceStatsByProduct = new HashMap<>();

        int scanned = 0;
        int page = 0;

        while (scanned < TRENDING_MAX_CANDIDATES_SCAN) {
            Slice<UUID> slice = trendingDealRepository.findTrendingCandidateIdsSlice(
                    TrendingDealEngine.MIN_TRUST_SCORE_INCLUSIVE,
                    priceSince,
                    PageRequest.of(
                            page,
                            TRENDING_CANDIDATE_SLICE_SIZE,
                            Sort.by(Sort.Order.desc("isPinned"), Sort.Order.desc("updatedAt"))));

            List<UUID> candidateIds = slice.getContent();
            if (candidateIds.isEmpty()) break;
            scanned += candidateIds.size();

            List<ProductListing> candidates =
                    trendingDealRepository.findAllWithProductAndPlatformByIdIn(candidateIds);

            List<PriceRecord> allRecentRecords =
                    priceRecordRepository.findLatestPriceRecordsByListingIdsInCapped(
                            candidateIds,
                            priceSince,
                            TRENDING_PRICE_RECORDS_PER_LISTING);

            Map<UUID, List<PriceRecord>> recsByListingId = new HashMap<>();
            for (PriceRecord pr : allRecentRecords) {
                if (pr == null || pr.getProductListing() == null || pr.getProductListing().getId() == null) continue;
                UUID lid = pr.getProductListing().getId();
                recsByListingId.computeIfAbsent(lid, _k -> new ArrayList<>()).add(pr);
            }

            for (ProductListing listing : candidates) {
                try {
                    if (listing == null || listing.getId() == null || listing.getProduct() == null || listing.getProduct().getId() == null) {
                        continue;
                    }
                    Double trust = listing.getTrustScore();
                    if (trust == null || trust < TrendingDealEngine.MIN_TRUST_SCORE_INCLUSIVE) {
                        continue;
                    }

                    List<PriceRecord> recsDesc = recsByListingId.getOrDefault(listing.getId(), List.of());
                    if (!TrendingDealEngine.isEligibleOrganic(listing, recsDesc)) {
                        continue;
                    }

                    DealScoreCalculation calc = TrendingDealEngine.score(listing, recsDesc);
                    PriceRecord latest = TrendingDealEngine.latest(recsDesc);
                    TrendingDealDTO dto = new TrendingDealDTO(listing, calc, latest, recsDesc);

                    UUID productId = listing.getProduct().getId();
                    if (latest != null) {
                        priceStatsByProduct.computeIfAbsent(productId, _k -> new PriceConflictStats())
                                .observe(latest.getPrice());
                    }

                    TrendingDealDTO prev = bestByProduct.get(productId);
                    if (prev == null || dedupRepresentativeComparator().compare(dto, prev) > 0) {
                        bestByProduct.put(productId, dto);
                    }
                } catch (RuntimeException ex) {
                    log.warn("Skip trending candidate listingId={} due to error: {}",
                            listing != null ? listing.getId() : null, ex.toString());
                }
            }

            if (!slice.hasNext()) break;
            page++;
        }

        List<TrendingDealDTO> representatives = bestByProduct.values().stream()
                .filter(Objects::nonNull)
                .sorted(trendingSortComparator())
                .limit(MAX_TRENDING_DEALS_RETURN)
                .toList();

        Map<UUID, Boolean> priceConflictByProduct = new HashMap<>(priceStatsByProduct.size());
        for (Map.Entry<UUID, PriceConflictStats> e : priceStatsByProduct.entrySet()) {
            priceConflictByProduct.put(e.getKey(), e.getValue() != null && e.getValue().isConflict());
        }

        List<TrendingDealResponse> body;
        body = representatives.stream()
                .map(d -> {
                    try {
                        if (d == null || d.listing() == null || d.listing().getProduct() == null) {
                            return null;
                        }
                        UUID pid = d.listing().getProduct().getId();
                        TrendingDealResponse res =
                                mapToResponse(d, pid != null ? priceConflictByProduct.get(pid) : Boolean.FALSE);
                        if (res == null) return null;

                        String name = res.getProductName();
                        if (name != null) {
                            String s = name.toUpperCase();
                            if (s.contains("[DEMO") || s.contains("DEMO-") || s.contains("DEMO_")) {
                                return null;
                            }
                        }
                        return res;
                    } catch (Exception ex) {
                        return null;
                    }
                })
                .filter(Objects::nonNull)
                .toList();

        return new TrendingDealsSnapshot(
                body,
                computedAt,
                TrendingDealEngine.SNAPSHOT_CACHE_TTL_SECONDS);
    }

    private TrendingDealResponse mapToResponse(ProductListing l, DealScoreCalculation calc, PriceRecord latest) {
        if (l == null) {
            return null;
        }
        Integer currentPrice = latest != null ? latest.getPrice() : null;
        Integer originalPrice = latest != null ? latest.getOriginalPrice() : null;
        float discountPct = TrendingDealEngine.calculateDisplayDiscountPct(latest);
        boolean flashSale = latest != null && Boolean.TRUE.equals(latest.getIsFlashSale());

        boolean pinned = Boolean.TRUE.equals(l.getIsPinned());
        String badge = TrendingDealEngine.computeBadge(pinned, discountPct);

        String explanation = TrendingDealEngine.Explanations.forDeal(l, calc, discountPct, latest);

        String imageUrl = null;
        if (l.getProduct() != null && l.getProduct().getImageUrl() != null && !l.getProduct().getImageUrl().isEmpty()) {
            imageUrl = l.getProduct().getImageUrl();
        } else if (l.getPlatformImageUrl() != null && !l.getPlatformImageUrl().isEmpty()) {
            imageUrl = l.getPlatformImageUrl();
        }

        UUID productId = l.getProduct() != null ? l.getProduct().getId() : null;
        String productName = l.getProduct() != null ? l.getProduct().getName() : null;

        DealScoreCalculation safeCalc = calc != null ? calc : DealScoreCalculation.zero();

        return TrendingDealResponse.builder()
                .listingId(l.getId())
                .productId(productId)
                .productName(productName)
                .imageUrl(imageUrl)
                .platformName(l.getPlatform() != null && l.getPlatform().getName() != null
                        ? l.getPlatform().getName()
                        : (l.getPlatformName() != null ? l.getPlatformName() : ""))
                .currentPrice(currentPrice)
                .originalPrice(originalPrice)
                .discountPercent(discountPct)
                .isFlashSale(flashSale)
                .dealScore(safeCalc.totalDealScore())
                .badge(badge)
                .explanation(explanation)
                .isPinned(pinned)
                .discountScore(safeCalc.discountScore())
                .trustScore(safeCalc.trustScore())
                .freshnessScore(safeCalc.freshnessScore())
                .build();
    }

    private TrendingDealResponse mapToResponse(TrendingDealDTO dto, Boolean priceConflict) {
        if (dto == null) {
            return null;
        }
        TrendingDealResponse res =
                mapToResponse(dto.listing(), dto.score(), dto.latestPriceRecord());
        if (res == null) {
            return null;
        }
        boolean conflict = Boolean.TRUE.equals(priceConflict);
        res.setPriceConflict(conflict);
        res.setPriceConflictMessage(conflict ? "Có chênh lệch giá giữa các shop/sàn" : null);
        if (res.getExplanation() == null || res.getExplanation().trim().length() < TrendingDealEngine.MIN_EXPLANATION_LENGTH) {
            res.setExplanation((res.getExplanation() == null ? "" : res.getExplanation().trim())
                    + " Có chênh lệch giá giữa các shop/sàn, hãy so sánh kỹ trước khi mua.");
        }
        return res;
    }

    static Comparator<TrendingDealDTO> dedupRepresentativeComparator() {
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
                .comparing((TrendingDealDTO d) -> d.listing() != null && Boolean.TRUE.equals(d.listing().getIsPinned()),
                        Comparator.reverseOrder())
                .thenComparing((TrendingDealDTO d) -> {
                    PriceRecord latest = d.latestPriceRecord();
                    if (latest == null) return 0.0;
                    return TrendingDealEngine.platformDiscountPct(latest);
                }, Comparator.reverseOrder())
                .thenComparing((TrendingDealDTO d) -> {
                    PriceRecord latest = d.latestPriceRecord();
                    return latest != null && Boolean.TRUE.equals(latest.getIsFlashSale());
                }, Comparator.reverseOrder())
                .thenComparing((TrendingDealDTO d) -> d.score().totalDealScore(), Comparator.reverseOrder())
                .thenComparing((TrendingDealDTO d) -> d.score().discountScore(), Comparator.reverseOrder())
                .thenComparing((TrendingDealDTO d) -> d.score().trustScore(), Comparator.reverseOrder())
                .thenComparing(d -> {
                    PriceRecord latest = d.latestPriceRecord();
                    Integer p = latest != null ? latest.getPrice() : null;
                    return p == null ? Integer.MAX_VALUE : p;
                });
    }

    static final class PriceConflictStats {
        private Integer minPrice;
        private Integer maxPrice;

        void observe(Integer price) {
            if (price == null || price <= 0) return;
            if (minPrice == null || price < minPrice) minPrice = price;
            if (maxPrice == null || price > maxPrice) maxPrice = price;
        }

        boolean isConflict() {
            if (minPrice == null || maxPrice == null) return false;
            if (minPrice <= 0) return false;
            double diffPct = (maxPrice - minPrice) / (double) minPrice * 100.0;
            return diffPct >= 7.0;
        }
    }
}
