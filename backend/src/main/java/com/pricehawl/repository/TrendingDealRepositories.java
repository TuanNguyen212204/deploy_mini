package com.pricehawl.repository;

import com.pricehawl.entity.PriceAlert;
import com.pricehawl.entity.PriceRecord;
import com.pricehawl.entity.Product;
import com.pricehawl.entity.ProductListing;
import com.pricehawl.entity.ProductListingSignal;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

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

        @Query("""
                SELECT DISTINCT p FROM ProductListing p
                LEFT JOIN FETCH p.product
                LEFT JOIN FETCH p.platform
                """)
        List<ProductListing> findTrendingCandidates();
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
    }

    public interface PriceAlertRepository extends JpaRepository<PriceAlert, UUID> {

        List<PriceAlert> findByUser_IdAndIsActiveTrue(UUID userId);
    }

    public interface ProductListingSignalRepository extends JpaRepository<ProductListingSignal, UUID> {

        List<ProductListingSignal> findByListingIdIn(List<UUID> listingIds);
    }
}
