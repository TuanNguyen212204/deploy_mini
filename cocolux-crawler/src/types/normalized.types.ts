export type NormalizedCategory = {
  rawName: string | null;
  normalizedName: string | null;
  slug: string | null;
  categoryPath: string | null;
  parentRawName: string | null;
  parentSlug: string | null;
};

export type NormalizedBrand = {
  rawName: string | null;
  normalizedName: string | null;
  slug: string | null;
  countryOfOrigin: string | null;
};

export type NormalizedProductCore = {
  rawName: string | null;
  normalizedName: string | null;
  barcode: string | null;
  description: string | null;
  imageUrl: string | null;
  volumeText: string | null;
  volumeValue: number | null;
  volumeUnit: string | null;
  attributes: Record<string, unknown>;
  contentHash: string;
};

export type ListingSnapshot = {
  platformName: string;
  url: string | null;
  platformImageUrl: string | null;
  status: 'active' | 'out_of_stock' | 'inactive' | 'unknown';
  crawlTime: string;
  isFakePromo: boolean;
  isPinned: boolean;
  trustScore: number;
};

export type PriceSnapshot = {
  price: number | null;
  originalPrice: number | null;
  discountPct: number | null;
  inStock: boolean | null;
  promotionLabel: string | null;
  isFlashSale: boolean;
  crawledAt: string;
};

export type MatchingHints = {
  brandName: string | null;
  barcode: string | null;
  variantText: string | null;
  modelText: string | null;
};

export type SourceRefs = {
  platformName: string;
  categoryPath: string | null;
  categoryName: string | null;
  listingPage: number | null;
  productUrl: string | null;
  listingCrawledAt: string | null;
  detailCrawledAt: string | null;
};

export type NormalizedProductRecord = {
  id: string;
  source: SourceRefs;
  category: NormalizedCategory;
  brand: NormalizedBrand;
  product: NormalizedProductCore;
  listing: ListingSnapshot;
  price: PriceSnapshot;
  matchingHints: MatchingHints;
  normalizedAt: string;
};

export type NormalizeSummary = {
  totalListingItems: number;
  totalDetailItems: number;
  totalNormalized: number;
  totalWithDetail: number;
  totalWithoutDetail: number;
};