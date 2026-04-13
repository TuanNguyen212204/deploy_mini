export type Platform = 'Shopee' | 'Lazada' | 'Tiki' | 'Sendo';

export type PlatformPrice = {
  platform: Platform;
  shopName: string;
  shopLogo?: string;
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
};

export type PricePoint = {
  date: string;
  price: number;
  originalPrice?: number;
};

export type PromotionEvent = {
  id: string;
  title: string;
  date: string;
  type: 'flash-sale' | 'voucher' | 'campaign' | 'price-drop';
  note?: string;
};

export type PriceInsight = {
  isLowest30Days: boolean;
  isLowest90Days: boolean;
  isFakeDiscountRisk: boolean;
  lowerThanAvg30dPercent: number;
  recommendation: 'buy-now' | 'wait' | 'watch';
  summary: string;
};

export type ProductSpecMap = Record<string, string>;

export type Product = {
  id: number;
  slug: string;
  name: string;
  brand: string;
  model: string;
  category: string;
  subcategory?: string;
  images: string;
  description: string;
  specs: ProductSpecMap;
  rating: number;
  reviews: number;
  platforms: PlatformPrice[];
  priceHistory7d: PricePoint[];
  priceHistory30d: PricePoint[];
  priceHistory90d: PricePoint[];
  promotionEvents: PromotionEvent[];
  insight: PriceInsight;
  isWishlisted: boolean;
  relatedProductIds: number[];
};