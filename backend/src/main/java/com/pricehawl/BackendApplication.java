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
}
