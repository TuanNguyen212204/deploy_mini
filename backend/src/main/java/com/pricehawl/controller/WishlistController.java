package com.pricehawl.controller;

import com.pricehawl.entity.Wishlist;
import com.pricehawl.service.WishlistService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/wishlist")
public class WishlistController {
    @Autowired
    private WishlistService wishlistService;

    @GetMapping("/{userId}")
    public List<Wishlist> getWishlist(@PathVariable UUID userId) {
        return wishlistService.getWishlistByUser(userId);
    }

    @PostMapping("/{userId}/add/{productId}")
    public Wishlist add(@PathVariable UUID userId, @PathVariable UUID productId) {
        return wishlistService.addToWishlist(userId, productId);
    }

    @DeleteMapping("/{userId}/remove/{productId}")
    public void remove(@PathVariable UUID userId, @PathVariable UUID productId) {
        wishlistService.removeFromWishlist(userId, productId);
    }
}