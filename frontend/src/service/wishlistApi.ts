import axios from 'axios';

const API_URL = 'http://localhost:8080/api/wishlist';

export const wishlistService = {
  // 1. Lấy danh sách: Thêm kiểu string cho userId
  getWishlist: async (userId: string) => {
    try {
      const response = await axios.get(`${API_URL}/${String(userId)}`);
      return response.data;
    } catch (error) {
      console.error("Error fetching wishlist:", error);
      throw error;
    }
  },

  // 2. Thêm: Thêm kiểu string cho cả userId và productId
  add: async (userId: string, productId: string) => {
    try {
      const response = await axios.post(`${API_URL}/add`, {
        userId: String(userId),
        productId: String(productId)
      });
      return response.data;
    } catch (error) {
      console.error("Error adding to wishlist:", error);
      throw error;
    }
  },

  // 3. Xóa: Thêm kiểu string cho wishlistId
  remove: async (wishlistId: string) => {
    try {
      const response = await axios.delete(`${API_URL}/${String(wishlistId)}`);
      return response.data;
    } catch (error) {
      console.error("Error removing from wishlist:", error);
      throw error;
    }
  }
};