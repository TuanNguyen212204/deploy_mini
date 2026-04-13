package com.pricehawl.service;

import com.pricehawl.dto.PriceComparisonItemResponse;
import com.pricehawl.dto.PriceComparisonResponse;
import com.pricehawl.entity.PriceRecord;
import com.pricehawl.entity.Product;
import com.pricehawl.entity.ProductListing;
import com.pricehawl.exception.ResourceNotFoundException;
import com.pricehawl.repository.PriceRecordRepository;
import com.pricehawl.repository.ProductListingRepository;
import com.pricehawl.repository.ProductRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.Comparator;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PriceComparisonServiceImpl implements PriceComparisonService {

    private final ProductRepository productRepository;
    private final ProductListingRepository productListingRepository;
    private final PriceRecordRepository priceRecordRepository;

    @Override
    public PriceComparisonResponse compareByProductId(UUID productId) {

        // 1. Tìm product
        Product product = productRepository.findById(productId)
                .orElseThrow(() ->
                        new ResourceNotFoundException("Product not found with id: " + productId));

        // 2. Lấy danh sách listing theo productId
        List<ProductListing> listings = productListingRepository.findByProductId(productId);

        // 3. Với mỗi listing, lấy giá mới nhất rồi map sang DTO
        List<PriceComparisonItemResponse> comparisons = listings.stream()
                .map(listing -> {
                    PriceRecord latestPrice = priceRecordRepository
                            .findTopByProductListingIdOrderByCrawledAtDesc(listing.getId())
                            .orElse(null);

                    // Nếu listing chưa có giá thì bỏ qua
                    if (latestPrice == null) {
                        return null;
                    }

                    return PriceComparisonItemResponse.builder()
                            .platformId(listing.getPlatform().getId())
                            .platformName(listing.getPlatform().getName())
                            .listingId(listing.getId())
                            .url(listing.getUrl())
                            .platformImageUrl(listing.getPlatformImageUrl())
                            .price(latestPrice.getPrice())
                            .originalPrice(latestPrice.getOriginalPrice())
                            .discountPct(latestPrice.getDiscountPct())
                            .inStock(latestPrice.getInStock())
                            .promotionLabel(latestPrice.getPromotionLabel())
                            .isFlashSale(latestPrice.getIsFlashSale())
                            .crawledAt(latestPrice.getCrawledAt())
                            .build();
                })
                .filter(item -> item != null)
                .sorted(Comparator.comparing(PriceComparisonItemResponse::getPrice))
                .collect(Collectors.toList());

        // 4. Tạo response tổng
        return PriceComparisonResponse.builder()
                .productId(product.getId())
                .productName(product.getName())
                .productImageUrl(product.getImageUrl())
                .comparisons(comparisons)
                .build();
    }
}