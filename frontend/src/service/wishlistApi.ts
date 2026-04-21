import axios, { AxiosError } from 'axios';
import apiClient from '../api/apiClient';

// Chuẩn hoá log lỗi axios: in cả status + response.data để biết chính xác
// backend trả gì (message, code, timestamp...) thay vì chỉ "Request failed".
function logAxiosError(context: string, error: unknown) {
  if (axios.isAxiosError(error)) {
    const ax = error as AxiosError;
    console.error(`[wishlistApi] ${context}`, {
      message: ax.message,
      status: ax.response?.status,
      statusText: ax.response?.statusText,
      url: ax.config?.url,
      method: ax.config?.method,
      data: ax.response?.data,
    });
  } else {
    console.error(`[wishlistApi] ${context}`, error);
  }
}

export const wishlistService = {
  getWishlist: async (userId: string) => {
    try {
      const response = await apiClient.get(`/wishlist/${String(userId)}`);
      return response.data as unknown;
    } catch (error) {
      logAxiosError('Error fetching wishlist', error);
      throw error;
    }
  },

  add: async (userId: string, productId: string) => {
    try {
      const response = await apiClient.post(`/wishlist/add`, {
        userId: String(userId),
        productId: String(productId),
      });
      return response.data;
    } catch (error) {
      logAxiosError('Error adding to wishlist', error);
      throw error;
    }
  },

  /**
   * Xóa wishlist theo productId.
   *
   * QUAN TRỌNG: Backend endpoint là DELETE /api/wishlist/{productId}?userId=xxx
   * (trước đây FE gọi thiếu userId nên BE không match handler → 500).
   * Giờ bắt buộc truyền kèm userId qua query param.
   */
  remove: async (productId: string, userId: string) => {
    try {
      const response = await apiClient.delete(`/wishlist/${String(productId)}`, {
        params: { userId: String(userId) },
      });
      return response.data;
    } catch (error) {
      logAxiosError('Error removing from wishlist', error);
      throw error;
    }
  },
};
