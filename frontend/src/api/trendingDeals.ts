import type { TrendingDealDto, TrendingDealsApiMeta } from '../types/trendingDeal'

/**
 * Base URL API:
 * - Dev (khuyến nghị): để trống → dùng `/api` + proxy Vite → localhost:8080
 * - Hoặc set VITE_API_BASE_URL=http://localhost:8080 (cần CORS trên backend)
 */
export function getApiBaseUrl(): string {
  const v = import.meta.env.VITE_API_BASE_URL as string | undefined
  return (v && v.replace(/\/$/, '')) || ''
}

/**
 * Dev: mặc định gọi backend (nếu không set env).
 * Production: chỉ khi VITE_USE_TRENDING_API=true.
 */
export function resolveUseTrendingApi(): boolean {
  const raw = import.meta.env.VITE_USE_TRENDING_API
  const s = String(raw ?? '').toLowerCase().trim()
  if (s === 'false' || s === '0') return false
  if (s === 'true' || s === '1') return true
  return import.meta.env.DEV
}

function readTrendingMeta(res: Response): TrendingDealsApiMeta | null {
  const computedAt = res.headers.get('X-Trending-Computed-At')
  const next = res.headers.get('X-Trending-Next-Refresh-After')
  const ttlRaw = res.headers.get('X-Trending-Cache-Ttl-Seconds')
  if (!computedAt || !next) return null
  const cacheTtlSeconds = ttlRaw != null ? Number(ttlRaw) : NaN
  return {
    computedAt,
    nextRefreshAfter: next,
    cacheTtlSeconds: Number.isFinite(cacheTtlSeconds) ? cacheTtlSeconds : 7200,
  }
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

export type TrendingDealsFetchResult = {
  deals: TrendingDealDto[]
  meta: TrendingDealsApiMeta | null
}

export async function fetchTrendingDeals(
  expand = false,
): Promise<TrendingDealsFetchResult> {
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
  return {
    deals: data.map((row) => normalizeDeal(row as Record<string, unknown>)),
    meta: readTrendingMeta(res),
  }
}
