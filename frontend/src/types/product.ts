/** Tên sàn: API chính + giá trị dùng trong mock alert / legacy */
export type PlatformName =
  | 'Coculux'
  | 'Gardian'
  | 'Hasaki'
  | 'Shopee'
  | 'Lazada'
  | 'Tiki'
  | 'Sendo';

/** Map từ ProductSearchDTO */
export interface Platform {
  platform: string;
  url: string;
  platformImageUrl: string;
  finalPrice: number;
  isOfficial: boolean;
}

export interface ProductSearch {
  id: string;
  name: string;
  brand: string;
  model: string;
  category: string;
  subcategory?: string;
  images: string[];
  description: string;
  categoryName: string;
  brandName: string;
  score: number;
  imageUrl: string;
  platforms: Platform[];
}

// Map từ PriceComparisonResponse
export interface PriceComparison {
  productId: string;
  productName: string;
  imageUrls: string[];
  comparisons: PriceComparisonItem[];
}

export interface PriceComparisonItem {
  platformId: number;
  platformName: string;
  listingId: string;
  url: string;
  platformImageUrl: string;
  price: number;
  originalPrice: number;
  discountPct: number;
  inStock: boolean;
  promotionLabel: string;
  isFlashSale: boolean;
  crawledAt: string;
}

// Map từ PriceHistoryResponse
export interface PriceHistory {
  productId: string;
  platforms: PlatformPriceData[];
}

export interface PlatformPriceData {
  platformId: number;
  platformName: string;
  latestPrice: number;
  averagePrice30Days: number;
  fakePriceIncreaseWarning: boolean;
  prices: PricePoint[];
}

export interface PricePoint {
  crawledAt: string;
  price: number;
}

/** Gợi ý giá (mock / UI chi tiết) */
export interface PriceInsight {
  isLowest30Days?: boolean;
  isLowest90Days: boolean;
  isFakeDiscountRisk: boolean;
  lowerThanAvg30dPercent: number;
  recommendation: 'buy-now' | 'wait' | 'watch';
  summary: string;
}

export interface PriceHistoryPoint {
  date: string;
  price: number;
}

export interface PromotionEvent {
  id: string;
  title: string;
  date: string;
  type: string;
}

/** Bản ghi sàn đầy đủ — dùng trong mockProducts */
export interface PlatformPrice {
  platform: string;
  shopName: string;
  isOfficial: boolean;
  currentPrice: number;
  originalPrice: number;
  voucherDiscount: number;
  shippingFee: number;
  finalPrice: number;
  rating: number;
  soldCount: number;
  inStock: boolean;
  lastCrawledAt: string;
  url: string;
}

/** Sản phẩm mock đầy đủ (slug, specs, lịch sử giá, …) */
export interface Product {
  id: string;
  slug: string;
  name: string;
  brand: string;
  model: string;
  category: string;
  subcategory?: string;
  images: string[];
  description: string;
  specs: Record<string, string>;
  rating: number;
  reviews: number;
  platforms: PlatformPrice[];
  priceHistory7d: PriceHistoryPoint[];
  priceHistory30d: PriceHistoryPoint[];
  priceHistory90d: PriceHistoryPoint[];
  promotionEvents: PromotionEvent[];
  insight: PriceInsight;
  isWishlisted: boolean;
  relatedProductIds: number[];
}
