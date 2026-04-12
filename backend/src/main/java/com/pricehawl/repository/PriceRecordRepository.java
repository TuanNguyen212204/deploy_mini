package com.pricehawl.repository;

import com.pricehawl.entity.PriceRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Repository
public interface PriceRecordRepository extends JpaRepository<PriceRecord, Long> {


    @Query("""
        SELECT pr FROM PriceRecord pr
        JOIN FETCH pr.productListing pl
        JOIN FETCH pl.product
        JOIN FETCH pl.platform
        WHERE pl.product.id = :productId
        AND pr.crawledAt >= :sinceDate
        ORDER BY pr.crawledAt ASC
    """)
    List<PriceRecord> findPriceHistoryLast30Days(
        @Param("productId") UUID productId,
        @Param("sinceDate") LocalDateTime sinceDate
    );
}
