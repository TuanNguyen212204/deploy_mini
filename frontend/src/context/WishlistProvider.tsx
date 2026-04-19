import React, { useState, useEffect } from 'react';
import { wishlistService } from '../service/wishlistApi';
import type { WishlistAddPayload, WishlistDisplayItem } from '../types/wishlist';
import { WISHLIST_CURRENT_USER_ID } from './wishlistConstants';
import { WishlistContext } from './wishlistContext';
import { wishlistDisplayFromPayload } from '../util/wishlistPayload';

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const [wishlist, setWishlist] = useState<WishlistDisplayItem[]>([]);

  useEffect(() => {
    const fetchWishlist = async () => {
      try {
        const data = await wishlistService.getWishlist(WISHLIST_CURRENT_USER_ID);
        setWishlist(data as WishlistDisplayItem[]);
      } catch (error) {
        console.error('Lỗi khi lấy wishlist từ server:', error);
      }
    };
    fetchWishlist();
  }, []);

  const addToWishlist = async (product: WishlistAddPayload) => {
    try {
      await wishlistService.add(WISHLIST_CURRENT_USER_ID, String(product.id));

      const newItem = wishlistDisplayFromPayload(product);
      setWishlist((prev) => [...prev, newItem]);
      console.log('Đã thêm vào DB thành công!');
    } catch (error) {
      console.error('Không thể thêm vào DB:', error);
      alert('Lỗi kết nối server!');
    }
  };

  const removeFromWishlist = async (productId: string) => {
    try {
      await wishlistService.remove(productId);
      setWishlist((prev) => prev.filter((item) => String(item.productId) !== String(productId)));
    } catch (error) {
      console.error('Lỗi khi xóa:', error);
    }
  };

  const isInWishlist = (productId: string) => {
    return wishlist.some((item) => String(item.productId) === String(productId));
  };

  return (
    <WishlistContext.Provider value={{ wishlist, addToWishlist, removeFromWishlist, isInWishlist }}>
      {children}
    </WishlistContext.Provider>
  );
}
