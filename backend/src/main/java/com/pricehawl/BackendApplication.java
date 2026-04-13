package com.pricehawl;

import com.pricehawl.entity.PriceRecord;
import com.pricehawl.entity.Product;
import com.pricehawl.entity.ProductListing;
import com.pricehawl.repository.PriceRecordRepository;
import com.pricehawl.repository.ProductListingRepository;
import com.pricehawl.repository.ProductRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@SpringBootApplication
public class BackendApplication {

    public static void main(String[] args) {
        SpringApplication.run(BackendApplication.class, args);
    }

    @Bean
    CommandLineRunner testRepositories(
            ProductRepository productRepository,
            ProductListingRepository productListingRepository,
            PriceRecordRepository priceRecordRepository
    ) {
        return args -> {
UUID productId = UUID.fromString("a1000000-0000-4000-8000-000000000001");
            System.out.println("=== TEST PRODUCT REPOSITORY ===");
            Optional<Product> productOpt = productRepository.findById(productId);
            System.out.println("Product found: " + productOpt.isPresent());

            System.out.println("=== TEST PRODUCT LISTING REPOSITORY ===");
            List<ProductListing> listings = productListingRepository.findByProductId(productId);
            System.out.println("Listing count: " + listings.size());

            System.out.println("=== TEST PRICE RECORD REPOSITORY ===");
            for (ProductListing listing : listings) {
                Optional<PriceRecord> latestPrice =
                        priceRecordRepository.findTopByProductListingIdOrderByCrawledAtDesc(listing.getId());

                System.out.println("Listing: " + listing.getUrl());
                System.out.println("Latest price exists: " + latestPrice.isPresent());
                latestPrice.ifPresent(price ->
                        System.out.println("Latest price: " + price.getPrice() + " - crawledAt: " + price.getCrawledAt())
                );
            }
        };
    }
}