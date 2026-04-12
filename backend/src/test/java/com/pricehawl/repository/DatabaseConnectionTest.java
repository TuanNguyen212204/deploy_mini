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
@DisplayName("Supabase Cosmetics Test")
class ProductRepositorySupabaseTest {

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private CategoryRepository categoryRepository;

    @Autowired
    private BrandRepository brandRepository;

    @Test
    @DisplayName("Should connect to Supabase successfully")
    void testConnection() {
        List<Product> products = productRepository.findAll();
        assertNotNull(products);
    }

    @Test
    @DisplayName("Should insert and read cosmetic product")
    void testInsertAndRead() {

        Category category = categoryRepository.save(
                Category.builder()
                        .name("Skincare")
                        .slug("skincare")
                        .build()
        );

        Brand brand = brandRepository.save(
                Brand.builder()
                        .name("La Roche-Posay")
                        .slug("la-roche-posay")
                        .build()
        );

        Product product = productRepository.save(
                Product.builder()
                        .name("La Roche-Posay Effaclar Serum")
                        .description("Serum trị mụn cho da dầu")
                        .category(category)
                        .brand(brand)
                        .attributes("{\"type\":\"serum\"}") // 🔥 tránh lỗi jsonb
                        .build()
        );

        Product found = productRepository.findById(product.getId()).orElse(null);

        assertNotNull(found);
        assertEquals("La Roche-Posay Effaclar Serum", found.getName());
    }

    @Test
    @DisplayName("Should run fuzzy search for cosmetics")
    void testFuzzySearchSupabase() {

        Category category = categoryRepository.save(
                Category.builder()
                        .name("Sunscreen")
                        .slug("sunscreen")
                        .build()
        );

        Brand brand = brandRepository.save(
                Brand.builder()
                        .name("Anessa")
                        .slug("anessa")
                        .build()
        );

        Product product = productRepository.save(
                Product.builder()
                        .name("Anessa Perfect UV Sunscreen")
                        .description("Kem chống nắng cao cấp")
                        .category(category)
                        .brand(brand)
                        .attributes("{\"type\":\"serum\"}") // 🔥 fix jsonb
                        .popularityScore(0)
                       .build()
        );

        // test fuzzy search (gõ đúng)
        List<Object[]> results = productRepository.fuzzySearchRaw("sunscreen");

        assertNotNull(results);
        assertFalse(results.isEmpty());

        Object[] row = results.get(0);
        assertEquals("Anessa Perfect UV Sunscreen", row[1]);

        productRepository.delete(product);
    }

    @Test
    @DisplayName("Should handle typo keyword (fuzzy search)")
    void testFuzzySearchTypo() {

        Category category = categoryRepository.save(
                Category.builder()
                        .name("Toner")
                        .slug("toner")
                        .build()
        );

        Brand brand = brandRepository.save(
                Brand.builder()
                        .name("Hada Labo")
                        .slug("hada-labo")
                        .build()
        );

        Product product = productRepository.save(
                Product.builder()
                        .name("Hada Labo Gokujyun Lotion")
                        .description("Nước hoa hồng cấp ẩm")
                        .category(category)
                        .brand(brand)
                        .attributes("{\"type\":\"serum\"}")
                        .popularityScore(0)
                        .build()
        );

        // 🔥 gõ sai vẫn phải ra
        List<Object[]> results = productRepository.fuzzySearchRaw("hada labo");

        assertNotNull(results);
        assertFalse(results.isEmpty());

        productRepository.delete(product);
    }
}