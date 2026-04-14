/** Meta AC-07 từ header HTTP (Spring Boot) */
export type TrendingDealsApiMeta = {
  computedAt: string
  nextRefreshAfter: string
  cacheTtlSeconds: number
}

/** Khớp JSON từ GET /api/trending-deals (Spring Boot + Jackson) */
export type TrendingDealDto = {
  listingId: string
  productId: string
  /** Nhóm canonical + biến thể (vd model); dùng để giới hạn 1 listing đại diện / nhóm */
  variantKey?: string
  productName: string
  imageUrl: string | null
  platformName: string
  /** Giá niêm yết tốt nhất (đã gồm voucher & phí ship) — khớp ProductSummary */
  currentPrice: number
  originalPrice: number | null
  discountPercent: number
  isFlashSale?: boolean
  dealScore: number
  badge: string
  explanation: string
  pinned: boolean
  /** Thành phần điểm 0–1, từ ScoreCalculator khi backend bật đủ trường */
  discountScore?: number
  trustScore?: number
  popularityScore?: number
  freshnessScore?: number
}
