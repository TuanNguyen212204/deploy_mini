package com.pricehawl.service;

import com.pricehawl.dto.PlatformDTO;
import com.pricehawl.dto.ProductSearchDTO;
import com.pricehawl.entity.PriceRecord;
import com.pricehawl.entity.Product;
import com.pricehawl.entity.ProductListing;
import com.pricehawl.repository.PriceRecordRepository;
import com.pricehawl.repository.ProductRepository;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collection;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import java.util.stream.Collectors;
import java.util.stream.Stream;

// ==========================================================================
// ProductService
// --------------------------------------------------------------------------
// Fix sau merge (endpoint /products/search bị 500 + giá hiển thị 0đ):
//   1. @Transactional(readOnly = true) → giữ Hibernate session mở để có thể
//      truy cập các collection LAZY (product.getListings()) mà không ném
//      LazyInitializationException.
//   2. Dùng repository.findAllByIdIn(...) (có @EntityGraph(attributePaths =
//      {"listings"})) thay vì findAllById(...) mặc định, để fetch listings
//      một lần (tránh N+1 và tránh LazyInit).
//   3. Null-safe toàn bộ truy cập: rows có thể null/empty, mỗi row có thể
//      thiếu cột, cast UUID/Number có thể lỗi → bọc try/catch từng row để
//      1 row hỏng không làm 500 toàn bộ response.
//   4. Luôn trả về platforms là List rỗng (không bao giờ null) để frontend
//      có thể map/.sort an toàn.
//   5. BATCH lấy PriceRecord mới nhất cho tất cả listing trong 1 query
//      (findLatestByProductListingIdIn) → điền vào PlatformDTO.finalPrice
//      thay cho fake 0.0 trước đây.
// ==========================================================================
@Service
public class ProductService {

    private static final Logger log = LoggerFactory.getLogger(ProductService.class);

    private final ProductRepository repository;
    private final PriceRecordRepository priceRecordRepository;

    public ProductService(ProductRepository repository,
                          PriceRecordRepository priceRecordRepository) {
        this.repository = repository;
        this.priceRecordRepository = priceRecordRepository;
    }

    @Transactional(readOnly = true)
    public List<ProductSearchDTO> search(String keyword) {
        if (keyword == null || keyword.trim().length() < 2) {
            return Collections.emptyList();
        }
        final String kw = keyword.trim();

        List<Object[]> rows;
        try {
            rows = repository.fuzzySearchRaw(kw);
        } catch (Exception ex) {
            log.error("fuzzySearchRaw failed for keyword='{}': {}", kw, ex.getMessage(), ex);
            return Collections.emptyList();
        }
        if (rows == null || rows.isEmpty()) {
            return Collections.emptyList();
        }

        List<UUID> ids = rows.stream()
                .map(ProductService::safeExtractId)
                .filter(Objects::nonNull)
                .distinct()
                .toList();

        // findAllByIdIn có @EntityGraph(attributePaths = {"listings"}) nên
        // listings sẽ được fetch cùng product, tránh LazyInitializationException.
        Map<UUID, Product> productById = new HashMap<>();
        if (!ids.isEmpty()) {
            try {
                List<Product> products = repository.findAllByIdIn(ids);
                if (products != null) {
                    for (Product p : products) {
                        if (p != null && p.getId() != null) {
                            productById.put(p.getId(), p);
                        }
                    }
                }
            } catch (Exception ex) {
                log.warn("findAllByIdIn failed, tiếp tục với map rỗng: {}", ex.getMessage());
            }
        }

        // Batch lấy giá mới nhất cho TẤT CẢ listing trong 1 query (tránh N+1).
        final Map<UUID, PriceRecord> latestPriceByListing =
                fetchLatestPrices(productById.values());

        final Map<UUID, Product> productMap = productById;
        return rows.stream()
                .map(r -> {
                    try {
                        return mapRowToDto(r, productMap, latestPriceByListing);
                    } catch (Exception ex) {
                        log.warn("Bỏ qua row search lỗi: {}", ex.getMessage());
                        return null;
                    }
                })
                .filter(Objects::nonNull)
                .toList();
    }

    // --------------------------------------------------------------------------
    // Helpers
    // --------------------------------------------------------------------------

    /**
     * Gom toàn bộ listing id từ các product đã load, gọi 1 query batch để lấy
     * PriceRecord mới nhất của mỗi listing. Trả về Map&lt;listingId, record&gt;.
     * Có lỗi DB → trả Map rỗng (finalPrice sẽ fallback 0.0, không 500).
     */
    private Map<UUID, PriceRecord> fetchLatestPrices(Collection<Product> products) {
        if (products == null || products.isEmpty()) {
            return Collections.emptyMap();
        }

        List<UUID> listingIds = products.stream()
                .filter(Objects::nonNull)
                .flatMap(p -> p.getListings() == null
                        ? Stream.<ProductListing>empty()
                        : p.getListings().stream())
                .filter(Objects::nonNull)
                .map(ProductListing::getId)
                .filter(Objects::nonNull)
                .distinct()
                .toList();

        if (listingIds.isEmpty()) {
            return Collections.emptyMap();
        }

        try {
            List<PriceRecord> latest =
                    priceRecordRepository.findLatestByProductListingIdIn(listingIds);
            if (latest == null || latest.isEmpty()) {
                return Collections.emptyMap();
            }

            // Trong tình huống hiếm gặp có nhiều record cùng crawledAt trên
            // cùng listing, giữ lại 1 (merger: a → a).
            return latest.stream()
                    .filter(pr -> pr != null
                            && pr.getProductListing() != null
                            && pr.getProductListing().getId() != null)
                    .collect(Collectors.toMap(
                            pr -> pr.getProductListing().getId(),
                            pr -> pr,
                            (a, b) -> a));
        } catch (Exception ex) {
            log.warn("findLatestByProductListingIdIn failed, giá sẽ fallback 0: {}",
                    ex.getMessage());
            return Collections.emptyMap();
        }
    }

    private static UUID safeExtractId(Object[] r) {
        if (r == null || r.length == 0 || r[0] == null) return null;
        Object v = r[0];
        if (v instanceof UUID u) return u;
        try {
            return UUID.fromString(v.toString());
        } catch (Exception ex) {
            return null;
        }
    }

    private static String safeStr(Object[] r, int idx) {
        if (r == null || idx < 0 || idx >= r.length || r[idx] == null) return null;
        return r[idx].toString();
    }

    private static double safeScore(Object[] r, int idx) {
        if (r == null || idx < 0 || idx >= r.length || r[idx] == null) return 0.0;
        Object v = r[idx];
        if (v instanceof Number n) return n.doubleValue();
        try {
            return Double.parseDouble(v.toString());
        } catch (Exception ex) {
            return 0.0;
        }
    }

    private static String resolveImageUrl(Product product) {
        if (product == null) return null;
        String url = product.getImageUrl();
        if (url != null && !url.isEmpty()) return url;
        List<ProductListing> listings = product.getListings();
        if (listings != null && !listings.isEmpty()) {
            ProductListing first = listings.get(0);
            if (first != null && first.getPlatformImageUrl() != null
                    && !first.getPlatformImageUrl().isEmpty()) {
                return first.getPlatformImageUrl();
            }
        }
        return null;
    }

    /**
     * Map listings → danh sách PlatformDTO. LUÔN trả về List (có thể rỗng,
     * không bao giờ null). Điền finalPrice từ map giá mới nhất đã batch-fetch;
     * nếu thiếu record thì fallback 0.0.
     */
    private static List<PlatformDTO> mapPlatforms(
            Product product,
            Map<UUID, PriceRecord> latestPriceByListing) {
        if (product == null || product.getListings() == null || product.getListings().isEmpty()) {
            return Collections.emptyList();
        }
        return product.getListings().stream()
                .filter(Objects::nonNull)
                .map(l -> {
                    PlatformDTO p = new PlatformDTO();
                    p.setPlatform(l.getPlatformName());
                    p.setUrl(l.getUrl());
                    p.setPlatformImageUrl(l.getPlatformImageUrl());

                    PriceRecord latest = latestPriceByListing == null
                            ? null
                            : latestPriceByListing.get(l.getId());
                    p.setFinalPrice(toDoublePrice(latest));
                    p.setIsOfficial(Boolean.TRUE); // TODO: map từ DB khi có field chính hãng
                    return p;
                })
                .toList();
    }

    /** Lấy giá double an toàn từ PriceRecord (null → 0.0). */
    private static double toDoublePrice(PriceRecord pr) {
        if (pr == null || pr.getPrice() == null) return 0.0;
        return pr.getPrice().doubleValue();
    }

    private static ProductSearchDTO mapRowToDto(
            Object[] r,
            Map<UUID, Product> productMap,
            Map<UUID, PriceRecord> latestPriceByListing) {
        UUID id = safeExtractId(r);
        if (id == null) return null;

        Product product = productMap.get(id);

        return new ProductSearchDTO(
                id,
                safeStr(r, 1),        // name
                safeStr(r, 2),        // description
                safeStr(r, 3),        // categoryName
                safeStr(r, 4),        // brandName
                safeScore(r, 5),      // score
                resolveImageUrl(product),
                mapPlatforms(product, latestPriceByListing) // luôn non-null
        );
    }
}
