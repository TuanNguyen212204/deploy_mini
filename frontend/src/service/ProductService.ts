import type { ProductSearch, PriceComparison, PriceHistory } from '../types/product';
import apiClient from '../api/apiClient';

export interface SearchProductsOptions {
    /**
     * Danh sách platform muốn lọc (ví dụ ['Hasaki','Cocolux']).
     * - `undefined` / rỗng  → không filter platform (giữ logic cũ).
     * - Backend nhận `?platform=X&platform=Y` (case-insensitive).
     */
    platforms?: string[];
}

/**
 * Search sản phẩm theo keyword + platform động.
 *
 * Cách đồng bộ state giữa UI và API call:
 *  - Caller truyền mảng `platforms` đang được chọn ở UI (Set → Array sorted).
 *  - Hook/page nên key useEffect bằng `[query, platformsKey]` trong đó
 *    `platformsKey = platforms.sort().join(',')` để re-fetch khi user
 *    tick/untick, nhưng không re-fetch thừa khi mảng cùng nội dung.
 */
export async function searchProducts(
    query: string,
    opts: SearchProductsOptions = {},
): Promise<ProductSearch[]> {
    const platforms = (opts.platforms ?? [])
        .map((p) => p?.trim())
        .filter((p): p is string => !!p && p.length > 0);

    const res = await apiClient.get<ProductSearch[]>('/products/search', {
        params: { q: query, ...(platforms.length > 0 ? { platform: platforms } : null) },
    });
    return res.data;
}

export async function priceComparison(productId: string): Promise<PriceComparison> {
    const res = await apiClient.get<PriceComparison>(`/compare/${productId}`);
    return res.data;
}

export async function priceHistory(productId: string): Promise<PriceHistory> {
    const res = await apiClient.get<PriceHistory>(`/v1/price-history/${productId}`);
    return res.data;
}
