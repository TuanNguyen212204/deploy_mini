package com.pricehawl.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "product_listing", indexes = {
        @Index(name = "idx_product_listing_product_id", columnList = "product_id")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProductListing {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "platform_id", nullable = false)
    private Platform platform;

    @Column(nullable = false, length = 500)
    private String platformName;

    @Column(nullable = false, length = 1000, unique = true)
    private String url;

    @Column(length = 500)
    private String platformImageUrl;

    @UpdateTimestamp
    @Column(nullable = false)
    private LocalDateTime updatedAt;

    @Column(nullable = false)
    @Builder.Default
    private Double trustScore = 0.0;

    @Column(length = 20, nullable = false)
    @Builder.Default
    private String status = "ACTIVE";

    @Column(nullable = false)
    @Builder.Default
    private Boolean isFakePromo = false;

    @Column(nullable = false)
    @Builder.Default
    private Boolean isPinned = false;

    @Column
    private LocalDateTime crawlTime;

    @OneToMany(mappedBy = "productListing", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @Builder.Default
    private List<PriceRecord> priceRecords = new ArrayList<>();

    public PriceRecord getLatestPriceRecord() {
        if (priceRecords == null || priceRecords.isEmpty()) {
            return null;
        }
        return priceRecords.stream()
                .max(Comparator.comparing(PriceRecord::getCrawledAt))
                .orElse(null);
    }
}
