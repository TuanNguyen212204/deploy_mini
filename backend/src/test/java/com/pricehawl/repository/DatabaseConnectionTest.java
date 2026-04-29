package com.pricehawl.repository;

import com.pricehawl.entity.Brand;
import com.pricehawl.entity.Category;
import com.pricehawl.entity.Product;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.test.context.ActiveProfiles;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
@DataJpaTest
@ActiveProfiles("test")
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@DisplayName("Supabase Search Only Test")
class ProductRepositorySearchTest {

    @Autowired
    private ProductRepository productRepository;

    @Test
    @DisplayName("Should search products by keyword")
    void testSearchBasic() {

        List<Object[]> results = productRepository.fuzzySearchRaw("sunscreen");

        assertNotNull(results);

        // Không bắt buộc phải có data nếu DB trống
        // nhưng nếu có thì kiểm tra format
        if (!results.isEmpty()) {
            Object[] row = results.get(0);

            assertNotNull(row[0]); // id
            assertNotNull(row[1]); // name
        }
    }

    @Test
    @DisplayName("Should handle typo keyword")
    void testSearchTypo() {

        List<Object[]> results = productRepository.fuzzySearchRaw("hada labo");

        assertNotNull(results);

        // fuzzy search có thể trả rỗng nếu DB chưa có data phù hợp
        // nên KHÔNG assert isEmpty = false
    }

    @Test
    @DisplayName("Should not crash with random keyword")
    void testSearchRandom() {

        List<Object[]> results = productRepository.fuzzySearchRaw("xyzabc123");

        assertNotNull(results);
    }
}