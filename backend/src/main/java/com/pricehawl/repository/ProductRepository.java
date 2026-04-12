package com.pricehawl.repository;

import org.springframework.stereotype.Repository;
import com.pricehawl.entity.Product;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;

import java.util.List;

@Repository
public interface ProductRepository extends JpaRepository<Product, String> {

    @Query(value = """
    SELECT 
        p.id,
        p.name,
        p.description,
        c.name AS category_name,
        b.name AS brand_name,
        (
            similarity(unaccent(lower(p.name)), unaccent(lower(:keyword))) * 0.5 +
            similarity(unaccent(lower(c.name)), unaccent(lower(:keyword))) * 0.3 +
            similarity(unaccent(lower(b.name)), unaccent(lower(:keyword))) * 0.2
        ) AS score
    FROM product p
    LEFT JOIN category c ON p.category_id = c.id
    LEFT JOIN brand b ON p.brand_id = b.id
    WHERE 
        similarity(unaccent(lower(p.name)), unaccent(lower(:keyword))) > 0.2
        OR similarity(unaccent(lower(c.name)), unaccent(lower(:keyword))) > 0.2
        OR similarity(unaccent(lower(b.name)), unaccent(lower(:keyword))) > 0.2
    ORDER BY score DESC
    LIMIT 20
    """, nativeQuery = true)
    List<Object[]> fuzzySearchRaw(@Param("keyword") String keyword);
}
