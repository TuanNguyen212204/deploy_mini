package com.pricehawl.repository;

import org.springframework.stereotype.Repository;
import com.pricehawl.entity.Product;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

@Repository
public interface ProductRepository extends JpaRepository<Product, UUID> {

    @Query(value = """
    SELECT 
        p.id,
        p.name,
        p.description,
        c.name AS categoryName,
        b.name AS brandName,
        (
            CASE 
                WHEN unaccent(lower(p.name)) = unaccent(lower(:keyword)) THEN 1.0
                ELSE 0
            END * 2.0
            +
            CASE 
                WHEN unaccent(lower(p.name)) LIKE unaccent(lower(:keyword)) || '%' THEN 1.0
                ELSE 0
            END * 1.2
            +
            CASE 
                WHEN unaccent(lower(p.name)) LIKE '%' || unaccent(lower(:keyword)) || '%' THEN 1.0
                ELSE 0
            END * 0.8
            +      similarity(unaccent(lower(p.name)), unaccent(lower(:keyword))) * 0.6
            +      similarity(unaccent(lower(COALESCE(b.name, ''))), unaccent(lower(:keyword))) * 0.25
            +      similarity(unaccent(lower(COALESCE(c.name, ''))), unaccent(lower(:keyword))) * 0.15
        ) AS score
    FROM product p
    LEFT JOIN category c ON p.category_id = c.id
    LEFT JOIN brand b ON p.brand_id = b.id
    WHERE 
        similarity(unaccent(lower(p.name)), unaccent(lower(:keyword))) > 0.1
        OR similarity(unaccent(lower(COALESCE(c.name, ''))), unaccent(lower(:keyword))) > 0.1
        OR similarity(unaccent(lower(COALESCE(b.name, ''))), unaccent(lower(:keyword))) > 0.1
        OR p.name ILIKE CONCAT('%', :keyword, '%')
    ORDER BY score DESC
    LIMIT 20
""", nativeQuery = true)
    List<Object[]> fuzzySearchRaw(@Param("keyword") String keyword);
    @EntityGraph(attributePaths = {"listings"})
    List<Product> findAllByIdIn(List<UUID> ids);
}
