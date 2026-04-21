import type { TrendingDealDto, TrendingDealsApiMeta } from '../types/trendingDeal'
import axios, { AxiosError } from 'axios'
import type { AxiosResponse } from 'axios'
import apiClient from './apiClient'

/**
 * Base URL API:
 * - Dev (khuyến nghị): để trống → dùng `/api` + proxy Vite → localhost:8080
 * - Hoặc set VITE_API_BASE_URL=http://localhost:8080 (cần CORS trên backend)
 */
export function getApiBaseUrl(): string {
  // Giữ hàm để tương thích code cũ, nhưng lấy từ apiClient để tránh fallback localhost khi production.
  return String(apiClient.defaults.baseURL ?? '/api')
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
  // Mặc định: ưu tiên gọi backend; nếu DB trống thì hook sẽ fallback sang mock.
  return true
}

function readTrendingMetaFromAxios(res: AxiosResponse): TrendingDealsApiMeta | null {
  const computedAt = (res.headers['x-trending-computed-at'] as string | undefined) ?? null
  const next =
    (res.headers['x-trending-next-refresh-after'] as string | undefined) ?? null
  const ttlRaw =
    (res.headers['x-trending-cache-ttl-seconds'] as string | undefined) ?? null
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

function readImageUrls(raw: Record<string, unknown>): string[] | null {
  const v = raw.imageUrls
  if (!Array.isArray(v)) return null
  const arr = v
    .map((x) => (x == null ? '' : String(x).trim()))
    .filter((s) => s.length > 0)
  return arr.length > 0 ? arr : null
}

function readString(raw: Record<string, unknown>, key: string): string | null {
  const v = raw[key]
  if (v == null) return null
  const s = String(v).trim()
  return s.length > 0 ? s : null
}

function normalizeDeal(raw: Record<string, unknown>): TrendingDealDto {
  const pinned =
    typeof raw.pinned === 'boolean'
      ? raw.pinned
      : typeof raw.isPinned === 'boolean'
        ? raw.isPinned
        : false

  const product =
    raw.product != null && typeof raw.product === 'object'
      ? (raw.product as Record<string, unknown>)
      : null

  const imageUrls =
    readImageUrls(raw) ??
    (product ? readImageUrls(product) : null) ??
    null

  const imageUrl =
    imageUrls?.[0] ??
    readString(raw, 'imageUrl') ??
    readString(raw, 'imageURL') ??
    (product ? readString(product, 'imageUrl') : null) ??
    (product ? readString(product, 'imageURL') : null) ??
    null

  return {
    listingId: String(raw.listingId ?? ''),
    productId: String(raw.productId ?? ''),
    variantKey:
      raw.variantKey != null && raw.variantKey !== ''
        ? String(raw.variantKey)
        : undefined,
    productName: String(raw.productName ?? ''),
    imageUrl,
    imageUrls,
    platformName: String(raw.platformName ?? ''),
    currentPrice: Number(raw.currentPrice ?? 0),
    originalPrice:
      raw.originalPrice == null ? null : Number(raw.originalPrice),
    discountPercent: Number(raw.discountPercent ?? 0),
    isFlashSale: typeof raw.isFlashSale === 'boolean' ? raw.isFlashSale : undefined,
    dealScore: Number(raw.dealScore ?? 0),
    badge: String(raw.badge ?? ''),
    explanation: String(raw.explanation ?? ''),
    pinned,
    discountScore: optionalScore(raw.discountScore),
    trustScore: optionalScore(raw.trustScore),
    freshnessScore: optionalScore(raw.freshnessScore),
  }
}

export type TrendingDealsFetchResult = {
  deals: TrendingDealDto[]
  meta: TrendingDealsApiMeta | null
  /**
   * Dấu mốc thời gian do server cung cấp để phát hiện “backend chạy lại”.
   * Backend hiện có header X-Trending-Computed-At, nên dùng làm proxy cho serverStartTime.
   */
  serverStartTime: string | null
}

export async function fetchTrendingDeals(
  expand = false,
  opts?: { refresh?: boolean },
): Promise<TrendingDealsFetchResult> {
  const requestConfig = {
    params: {
      ...(expand ? { expand: true } : null),
      ...(opts?.refresh ? { refresh: true } : null),
      // Cache-buster: tránh browser reuse response "from disk cache"
      _ts: Date.now(),
    },
    // Chặn cache trình duyệt (đặc biệt khi backend trả Cache-Control: max-age=...)
    // để tránh trường hợp FE hiển thị response cũ "from disk cache".
    headers: {
      Accept: 'application/json',
      'Cache-Control': 'no-cache',
      Pragma: 'no-cache',
    },
    // Render cold start / DB chậm có thể vượt 15s mặc định của apiClient
    timeout: 40_000,
  } as const

  try {
    const res = await apiClient.get<unknown>('/trending-deals', requestConfig)

    const data: unknown = res.data
    if (!Array.isArray(data)) {
      throw new Error('API trả về không phải mảng')
    }

    const meta = readTrendingMetaFromAxios(res)
    const serverStartTime = meta?.computedAt ?? null

    return {
      deals: data.map((row) => normalizeDeal(row as Record<string, unknown>)),
      meta,
      serverStartTime,
    }
  } catch (e: unknown) {
    // Chuẩn hoá lỗi để hook dễ nhận biết "Network Error"
    if (axios.isAxiosError(e)) {
      const ae = e as AxiosError
      const status = ae.response?.status
      const statusText = ae.response?.statusText
      if (status != null) {
        throw new Error(`API ${status}: ${statusText || 'Request failed'}`)
      }
      // Không có response => lỗi network / CORS / server down
      // Timeout: retry 1 lần (vẫn giữ UX không bị fail ngay khi cold start)
      const msg = String(ae.message || '').toLowerCase()
      const isTimeout = msg.includes('timeout')
      if (isTimeout) {
        try {
          const retry = await apiClient.get<unknown>('/trending-deals', requestConfig)
          const data2: unknown = retry.data
          if (!Array.isArray(data2)) {
            throw new Error('API trả về không phải mảng')
          }
          const meta2 = readTrendingMetaFromAxios(retry)
          const serverStartTime2 = meta2?.computedAt ?? null
          return {
            deals: data2.map((row) => normalizeDeal(row as Record<string, unknown>)),
            meta: meta2,
            serverStartTime: serverStartTime2,
          }
        } catch (e2: unknown) {
          // Nếu retry trả về HTTP status (vd 503) -> ưu tiên throw message đó thay vì timeout
          if (axios.isAxiosError(e2)) {
            const s2 = e2.response?.status
            const t2 = e2.response?.statusText
            if (s2 != null) {
              throw new Error(`API ${s2}: ${t2 || 'Request failed'}`)
            }
            throw new Error(e2.message || 'Network Error')
          }
          // fallthrough -> throw timeout message phía dưới
        }
      }
      throw new Error(ae.message || 'Network Error')
    }
    throw e
  }
}
