package com.pricehawl.repository;

import com.pricehawl.entity.PriceRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PriceRecordRepository extends JpaRepository<PriceRecord, Long> {

    // Lấy giá mới nhất của 1 listing
    Optional<PriceRecord> findTopByProductListingIdOrderByCrawledAtDesc(UUID productListingId);

    // Lấy toàn bộ lịch sử giá (dùng cho chart sau này)
    List<PriceRecord> findByProductListingIdOrderByCrawledAtDesc(UUID productListingId);

}