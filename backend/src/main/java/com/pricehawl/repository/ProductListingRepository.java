package com.pricehawl.repository;

import com.pricehawl.entity.ProductListing;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ProductListingRepository extends JpaRepository<ProductListing, UUID> {

    @Query("""
            SELECT DISTINCT p FROM ProductListing p
            LEFT JOIN FETCH p.product
            LEFT JOIN FETCH p.platform
            LEFT JOIN FETCH p.priceRecords
            WHERE p.trustScore >= 0.50
              AND p.status = 'ACTIVE'
              AND p.isFakePromo = false
              AND SIZE(p.priceRecords) >= 7
              AND p.crawlTime IS NOT NULL
            """)
    List<ProductListing> findValidListingsForTrending();
}
