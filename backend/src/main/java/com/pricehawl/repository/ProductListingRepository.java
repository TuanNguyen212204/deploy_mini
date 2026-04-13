package com.pricehawl.repository;

import com.pricehawl.entity.ProductListing;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ProductListingRepository extends JpaRepository<ProductListing, UUID> {

    // Lấy tất cả listing của 1 product
    List<ProductListing> findByProductId(UUID productId);

}