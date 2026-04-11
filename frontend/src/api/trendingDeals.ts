import type { TrendingDealDto } from '../types/trendingDeal'

/**
 * Base URL API:
 * - Dev (khuyến nghị): để trống → dùng `/api` + proxy Vite → localhost:8080
 * - Hoặc set VITE_API_BASE_URL=http://localhost:8080 (cần CORS trên backend)
 */
export function getApiBaseUrl(): string {
  const v = import.meta.env.VITE_API_BASE_URL as string | undefined
  return (v && v.replace(/\/$/, '')) || ''
}

function optionalScore(v: unknown): number | undefined {
  if (v == null) return undefined
  const n = Number(v)
  return Number.isFinite(n) ? n : undefined
}

function normalizeDeal(raw: Record<string, unknown>): TrendingDealDto {
  const pinned =
    typeof raw.pinned === 'boolean'
      ? raw.pinned
      : typeof raw.isPinned === 'boolean'
        ? raw.isPinned
        : false

  return {
    listingId: String(raw.listingId ?? ''),
    productId: String(raw.productId ?? ''),
    variantKey:
      raw.variantKey != null && raw.variantKey !== ''
        ? String(raw.variantKey)
        : undefined,
    category:
      raw.category != null && raw.category !== ''
        ? String(raw.category)
        : undefined,
    productName: String(raw.productName ?? ''),
    imageUrl: raw.imageUrl != null ? String(raw.imageUrl) : null,
    platformName: String(raw.platformName ?? ''),
    currentPrice: Number(raw.currentPrice ?? 0),
    originalPrice:
      raw.originalPrice == null ? null : Number(raw.originalPrice),
    discountPercent: Number(raw.discountPercent ?? 0),
    dealScore: Number(raw.dealScore ?? 0),
    badge: String(raw.badge ?? ''),
    explanation: String(raw.explanation ?? ''),
    pinned,
    discountScore: optionalScore(raw.discountScore),
    trendScore: optionalScore(raw.trendScore),
    trustScore: optionalScore(raw.trustScore),
    popularityScore: optionalScore(raw.popularityScore),
    freshnessScore: optionalScore(raw.freshnessScore),
  }
}

export async function fetchTrendingDeals(expand = false): Promise<TrendingDealDto[]> {
  const base = getApiBaseUrl()
  const url = `${base}/api/trending-deals${expand ? '?expand=true' : ''}`
  const res = await fetch(url, {
    headers: { Accept: 'application/json' },
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`API ${res.status}: ${text || res.statusText}`)
  }
  const data: unknown = await res.json()
  if (!Array.isArray(data)) {
    throw new Error('API trả về không phải mảng')
  }
  return data.map((row) => normalizeDeal(row as Record<string, unknown>))
}
