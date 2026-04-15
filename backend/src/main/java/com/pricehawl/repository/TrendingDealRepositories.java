package com.pricehawl.repository;

import com.pricehawl.entity.PriceAlert;
import com.pricehawl.entity.PriceRecord;
import com.pricehawl.entity.Product;
import com.pricehawl.entity.ProductListing;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

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
         * Đủ cho TrendingDealEngine (fake promo cần vài chục bản ghi gần nhất); tránh đọc
         * full lịch sử nếu crawler tích lũy nhiều năm.
         */
        List<PriceRecord> findTop400ByProductListingIdOrderByCrawledAtDesc(UUID productListingId);
    }

    public interface PriceAlertRepository extends JpaRepository<PriceAlert, UUID> {

        List<PriceAlert> findByUser_IdAndIsActiveTrue(UUID userId);
    }
}
