package com.pricehawl.repository;

import com.pricehawl.entity.Wishlist;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface WishlistRepository extends JpaRepository<Wishlist, UUID> {
    // Lấy danh sách wishlist của 1 user cụ thể
    List<Wishlist> findByUserId(UUID userId);
    
    // Tìm để xóa đúng sản phẩm của user đó
    void deleteByUserIdAndProductId(UUID userId, UUID productId);
    
    // Kiểm tra xem user đã thích sản phẩm này chưa
    boolean existsByUserIdAndProductId(UUID userId, UUID productId);
}