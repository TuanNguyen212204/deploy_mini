package com.pricehawl.service;

import com.pricehawl.entity.Wishlist; // Sửa lại đường dẫn này cho đúng
import com.pricehawl.repository.WishlistRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.UUID;

@Service
public class WishlistService {
    @Autowired
    private WishlistRepository wishlistRepository;

    public List<Wishlist> getWishlistByUser(UUID userId) {
        return wishlistRepository.findByUserId(userId);
    }

    public Wishlist addToWishlist(UUID userId, UUID productId) {
        if (wishlistRepository.existsByUserIdAndProductId(userId, productId)) {
            return null; // Hoặc ném Exception nếu sản phẩm đã tồn tại
        }
        Wishlist wishlist = new Wishlist();
        wishlist.setUserId(userId);
        wishlist.setProductId(productId);
        return wishlistRepository.save(wishlist);
    }

    @Transactional
    public void removeFromWishlist(UUID userId, UUID productId) {
        wishlistRepository.deleteByUserIdAndProductId(userId, productId);
    }
}