import type { TrendingDealDto, TrendingDealsApiMeta } from '../types/trendingDeal'
import axios, { AxiosError } from 'axios'
import type { AxiosResponse } from 'axios'
import apiClient from './apiClient'

export function getApiBaseUrl(): string {
  return String(apiClient.defaults.baseURL ?? '/api')
}

export function resolveUseTrendingApi(): boolean {
  const raw = import.meta.env.VITE_USE_TRENDING_API
  const s = String(raw ?? '').toLowerCase().trim()
  if (s === 'false' || s === '0') return false
  if (s === 'true' || s === '1') return true
  return true
}

function readTrendingMetaFromAxios(res: AxiosResponse): TrendingDealsApiMeta | null {
  const computedAt = (res.headers['x-trending-computed-at'] as string | undefined) ?? null
  const next = (res.headers['x-trending-next-refresh-after'] as string | undefined) ?? null
  const ttlRaw = (res.headers['x-trending-cache-ttl-seconds'] as string | undefined) ?? null
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
  const arr = v.map((x) => (x == null ? '' : String(x).trim())).filter((s) => s.length > 0)
  return arr.length > 0 ? arr : null
}

function readString(raw: Record<string, unknown>, key: string): string | null {
  const v = raw[key]
  if (v == null) return null
  const s = String(v).trim()
  return s.length > 0 ? s : null
}

function normalizeDeal(raw: Record<string, unknown>): TrendingDealDto {
  const pinned = typeof raw.pinned === 'boolean' ? raw.pinned : typeof raw.isPinned === 'boolean' ? raw.isPinned : false
  const product = raw.product != null && typeof raw.product === 'object' ? (raw.product as Record<string, unknown>) : null
  const imageUrls = readImageUrls(raw) ?? (product ? readImageUrls(product) : null) ?? null
  const imageUrl = imageUrls?.[0] ?? readString(raw, 'imageUrl') ?? readString(raw, 'imageURL') ?? (product ? readString(product, 'imageUrl') : null) ?? null

  return {
    listingId: String(raw.listingId ?? ''),
    productId: String(raw.productId ?? ''),
    variantKey: raw.variantKey != null && raw.variantKey !== '' ? String(raw.variantKey) : undefined,
    productName: String(raw.productName ?? ''),
    imageUrl,
    imageUrls,
    platformName: String(raw.platformName ?? ''),
    currentPrice: Number(raw.currentPrice ?? 0),
    originalPrice: raw.originalPrice == null ? null : Number(raw.originalPrice),
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
  serverStartTime: string | null
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function parseResponse(res: import('axios').AxiosResponse<unknown>): TrendingDealsFetchResult {
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
}

export async function fetchTrendingDeals(
  expand = false,
  opts?: { refresh?: boolean },
): Promise<TrendingDealsFetchResult> {
  const makeConfig = (timeoutMs: number) =>
    ({
      params: {
        ...(expand ? { expand: true } : null),
        ...(opts?.refresh ? { refresh: true } : null),
        _ts: Date.now(),
      },
      headers: {
        Accept: 'application/json',
        'Cache-Control': 'no-cache',
        Pragma: 'no-cache',
      },
      timeout: timeoutMs,
    }) as const

  const attempts = [
    { timeoutMs: 20_000, delayBeforeMs: 0 },
    { timeoutMs: 15_000, delayBeforeMs: 2_000 },
    { timeoutMs: 15_000, delayBeforeMs: 4_000 },
  ]

  let lastError: unknown = null

  for (let i = 0; i < attempts.length; i++) {
    const { timeoutMs, delayBeforeMs } = attempts[i]

    if (delayBeforeMs > 0) {
      console.log(`[trendingDeals] Retry #${i} sau ${delayBeforeMs}ms…`)
      await delay(delayBeforeMs)
    }

    try {
      const res = await apiClient.get<unknown>('/trending-deals', makeConfig(timeoutMs))
      return parseResponse(res)
    } catch (e: unknown) {
      lastError = e

      if (!axios.isAxiosError(e)) {
        throw e
      }

      const ae = e as AxiosError
      const status = ae.response?.status
      const msg = String(ae.message || '').toLowerCase()
      const isTimeout = msg.includes('timeout')
      const isRetryable = status === 503 || status === 502 || status === 504 || isTimeout || !ae.response

      if (!isRetryable) {
        if (status != null) {
          throw new Error(`API ${status}: ${ae.response?.statusText || 'Request failed'}`)
        }
        throw new Error(ae.message || 'Network Error')
      }

      console.warn(`[trendingDeals] Attempt ${i + 1}/${attempts.length} failed:`, status ? `HTTP ${status}` : (isTimeout ? 'Timeout' : 'Network Error'))

      if (i === attempts.length - 1) {
        if (status != null) {
          throw new Error(`API ${status}: ${ae.response?.statusText || 'Request failed'}`)
        }
        throw new Error(ae.message || 'Network Error')
      }
    }
  }

  throw lastError ?? new Error('Không thể tải dữ liệu trending từ backend.')
}
