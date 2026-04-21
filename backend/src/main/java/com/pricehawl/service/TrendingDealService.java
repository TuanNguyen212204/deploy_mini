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
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.CachePut;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.cache.annotation.Caching;
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

@Slf4j
@Service
@RequiredArgsConstructor
public class TrendingDealService {

    /** Giới hạn số listing xét trending mỗi lần tính (đủ lớn cho UX, tránh quét full DB). */
    private static final int TRENDING_MAX_CANDIDATE_LISTINGS = 250;
    /** Số bản ghi giá gần nhất mỗi listing dùng để score trending. */
    private static final int TRENDING_PRICE_RECORDS_PER_LISTING = 80;

    private final TrendingDealRepository trendingDealRepository;
    private final PriceRecordRepository priceRecordRepository;

    /**
     * Mặc định dùng cache (TTL do CacheManager cấu hình).
     * Nếu refresh=true thì xóa cache (theo key) và tính lại ngay từ DB.
     */
    public TrendingDealsSnapshot getTrendingDealsSnapshot(boolean expand, boolean refresh) {
        return refresh ? refreshTrendingDealsSnapshot(expand) : getTrendingDealsSnapshotCached(expand);
    }

    @Cacheable(cacheNames = "trendingDeals", key = "#expand")
    public TrendingDealsSnapshot getTrendingDealsSnapshotCached(boolean expand) {
        return buildSnapshot(expand);
    }

    /**
     * Evict cache trước, sau đó tính lại từ DB và put lại vào cache.
     * Lưu ý: phải là method public được gọi từ bên ngoài bean (controller) để Spring AOP áp dụng caching.
     */
    @Caching(
            evict = @CacheEvict(cacheNames = "trendingDeals", key = "#expand"),
            put = @CachePut(cacheNames = "trendingDeals", key = "#expand")
    )
    public TrendingDealsSnapshot refreshTrendingDealsSnapshot(boolean expand) {
        return buildSnapshot(expand);
    }

    private TrendingDealsSnapshot buildSnapshot(boolean expand) {
        // Bọc toàn bộ pipeline tính trending trong 1 try/catch duy nhất để
        // mọi lỗi không mong muốn (NPE dữ liệu bẩn, lỗi scoring, lỗi map...)
        // đều được chuyển thành TrendingDealsComputationException (→ 503),
        // thay vì để Spring bọc thành 500 chung chung.
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
        // Batch fetch price records: tránh N+1 query (mỗi listing 1 query).
        // Trả về pr đã sắp theo (listing_id, crawled_at desc).
        List<PriceRecord> allRecentRecords =
                priceRecordRepository.findLatestNByListingIds(candidateIds, TRENDING_PRICE_RECORDS_PER_LISTING);
        Map<UUID, List<PriceRecord>> recsByListingId = new HashMap<>();
        for (PriceRecord pr : allRecentRecords) {
            if (pr == null || pr.getProductListing() == null || pr.getProductListing().getId() == null) continue;
            UUID lid = pr.getProductListing().getId();
            recsByListingId.computeIfAbsent(lid, _k -> new ArrayList<>()).add(pr);
        }
        Map<UUID, Integer> candidateOrder = new HashMap<>(candidateIds.size());
        for (int i = 0; i < candidateIds.size(); i++) {
            candidateOrder.put(candidateIds.get(i), i);
        }
        candidates.sort(
                Comparator.comparingInt(l -> candidateOrder.getOrDefault(l.getId(), Integer.MAX_VALUE)));

        List<TrendingDealDTO> organicCandidates = new ArrayList<>();

        for (ProductListing listing : candidates) {
            // Phòng vệ per-listing: 1 bản ghi bẩn không được phép làm 500
            // toàn bộ response. Log và bỏ qua listing lỗi.
            try {
                if (listing == null || listing.getId() == null) {
                    continue;
                }
                List<PriceRecord> recsDesc = recsByListingId.getOrDefault(listing.getId(), List.of());

                if (TrendingDealEngine.isEligibleOrganic(listing, recsDesc)) {
                    DealScoreCalculation calc = TrendingDealEngine.score(listing, recsDesc);
                    PriceRecord latest = TrendingDealEngine.latest(recsDesc);
                    organicCandidates.add(new TrendingDealDTO(listing, calc, latest, recsDesc));
                }
            } catch (RuntimeException ex) {
                log.warn("Skip trending candidate listingId={} due to error: {}",
                        listing != null ? listing.getId() : null, ex.toString());
            }
        }

        List<TrendingDealDTO> scored = organicCandidates.stream()
                .sorted(trendingSortComparator())
                .toList();

        // --- Dedup theo product (tránh nhiều listing cùng 1 sản phẩm) ---
        // Null-safe: listing/product có thể null do lỗi dữ liệu → bỏ qua thay
        // vì ném NPE và làm 500 toàn bộ response.
        Map<UUID, List<TrendingDealDTO>> groupedByProduct = scored.stream()
                .filter(d -> d != null
                        && d.listing() != null
                        && d.listing().getProduct() != null
                        && d.listing().getProduct().getId() != null)
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
        // Null-safe ở tầng mapping: bỏ qua deal bị lỗi để không ném NPE/500.
        body = representatives.stream()
                .map(d -> {
                    try {
                        if (d == null || d.listing() == null || d.listing().getProduct() == null) {
                            return null;
                        }
                        UUID pid = d.listing().getProduct().getId();
                        return mapToResponse(d, pid != null ? priceConflictByProduct.get(pid) : Boolean.FALSE);
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
        float discountPct = latest != null ? (float) TrendingDealEngine.platformDiscountPct(latest) : 0f;
        boolean flashSale = latest != null && Boolean.TRUE.equals(latest.getIsFlashSale());

        boolean pinned = Boolean.TRUE.equals(l.getIsPinned());
        String badge = computeBadge(pinned, discountPct);

        String explanation = TrendingDealEngine.Explanations.forDeal(l, calc, discountPct, latest);

        // Ưu tiên ảnh gốc của product; nếu thiếu thì fallback sang ảnh của listing.
        String imageUrl = null;
        if (l.getProduct() != null && l.getProduct().getImageUrl() != null && !l.getProduct().getImageUrl().isEmpty()) {
            imageUrl = l.getProduct().getImageUrl();
        } else if (l.getPlatformImageUrl() != null && !l.getPlatformImageUrl().isEmpty()) {
            imageUrl = l.getPlatformImageUrl();
        }

        // Null-safe cho product (JOIN FETCH về lý thuyết luôn có product,
        // nhưng vẫn defensive để không ném NPE khi dữ liệu bẩn).
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

    private static String computeBadge(boolean pinned, float discountPct) {
        if (pinned) {
            return "PINNED";
        }
        if (discountPct >= 30f) {
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
