package com.pricehawl.repository;

import com.pricehawl.entity.PriceAlert;
import com.pricehawl.entity.PriceRecord;
import com.pricehawl.entity.Product;
import com.pricehawl.entity.ProductListing;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Gom JPA repository (nested). Bật {@code considerNestedRepositories} trên {@code @EnableJpaRepositories}.
 * Tên file/module theo chức năng trending deal để tách với phần khác trong nhóm.
 */
public final class TrendingDealRepositories {

    private TrendingDealRepositories() {
    }

    /**
     * Ứng viên sơ bộ (DB). Lọc sâu ở {@link com.pricehawl.service.TrendingDealEngine}.
     */
    public interface TrendingDealRepository extends JpaRepository<ProductListing, UUID> {

        /**
         * Chỉ lấy id + phân trang: tránh load toàn bộ listing (trước đây query không WHERE
         * có thể kéo hàng chục nghìn dòng và làm API treo).
         */
        @Query("""
                SELECT p.id FROM ProductListing p
                """)
        Page<UUID> findTrendingCandidateIds(Pageable pageable);

        /**
         * Candidate query có pre-filter mạnh ở DB:
         * - platform active (null coi như active)
         * - trustScore đạt ngưỡng yêu cầu
         * - có PriceRecord gần đây (để tránh listing "chết" làm nặng pipeline)
         *
         * Dùng Slice để scan theo batch mà không cần COUNT().
         */
        @Query("""
                SELECT p.id FROM ProductListing p
                JOIN p.platform plat
                WHERE (plat.isActive IS NULL OR plat.isActive = TRUE)
                  AND p.trustScore >= :minTrustScore
                  AND EXISTS (
                      SELECT 1 FROM PriceRecord pr
                      WHERE pr.productListing = p
                        AND pr.crawledAt >= :priceSince
                  )
                """)
        Slice<UUID> findTrendingCandidateIdsSlice(
                @Param("minTrustScore") double minTrustScore,
                @Param("priceSince") LocalDateTime priceSince,
                Pageable pageable);

        @Query("""
                SELECT DISTINCT p FROM ProductListing p
                JOIN FETCH p.product
                JOIN FETCH p.platform
                WHERE p.id IN :ids
                """)
        List<ProductListing> findAllWithProductAndPlatformByIdIn(@Param("ids") Collection<UUID> ids);
    }

    public interface ProductRepository extends JpaRepository<Product, UUID> {

        @EntityGraph(attributePaths = {"category", "brand"})
        @Override
        Optional<Product> findById(UUID id);

        @EntityGraph(attributePaths = {"category", "brand"})
        @Override
        Page<Product> findAll(Pageable pageable);
    }

    public interface PriceRecordRepository extends JpaRepository<PriceRecord, Long> {

        List<PriceRecord> findByProductListingIdOrderByCrawledAtDesc(UUID productListingId);

        /**
         * Batch lấy N bản ghi giá mới nhất cho mỗi listing trong danh sách, có filter `since`.
         * Dùng window function để tránh N+1 query ở `TrendingDealService`.
         */
        @Query(value = """
            SELECT * FROM (
              SELECT pr.*,
                     ROW_NUMBER() OVER (PARTITION BY pr.product_listing_id ORDER BY pr.crawled_at DESC) AS rn
              FROM price_record pr
              WHERE pr.product_listing_id IN (:listingIds)
                AND pr.crawled_at >= :since
            ) t
            WHERE t.rn <= :capPerListing
            ORDER BY t.product_listing_id, t.crawled_at DESC
            """, nativeQuery = true)
        List<PriceRecord> findLatestPriceRecordsByListingIdsInCapped(
                @Param("listingIds") Collection<UUID> listingIds,
                @Param("since") LocalDateTime since,
                @Param("capPerListing") int capPerListing
        );
    }

    public interface PriceAlertRepository extends JpaRepository<PriceAlert, UUID> {

        List<PriceAlert> findByUser_IdAndIsActiveTrue(UUID userId);
    }
}
