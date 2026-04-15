import { useEffect, useState } from 'react'
import { fetchTrendingDeals, resolveUseTrendingApi } from '../api/trendingDeals'
import { mockTrendingDealCandidates } from '../data/mockDeals'
import type { TrendingDealDto, TrendingDealsApiMeta } from '../types/trendingDeal'

function resolveAllowMockFallback(): boolean {
  const raw = import.meta.env.VITE_TRENDING_ALLOW_MOCK_FALLBACK
  const s = String(raw ?? '').toLowerCase().trim()
  if (s === 'true' || s === '1') return true
  if (s === 'false' || s === '0') return false
  // mặc định: KHÔNG fallback để tránh “nhìn như có data backend” nhưng thực ra là mock
  return false
}

export function useTrendingDeals() {
  const useApi = resolveUseTrendingApi()
  const allowMockFallback = resolveAllowMockFallback()
  const [deals, setDeals] = useState<TrendingDealDto[] | null>(useApi ? null : [])
  const [meta, setMeta] = useState<TrendingDealsApiMeta | null>(null)
  const [loading, setLoading] = useState(useApi)
  const [error, setError] = useState<string | null>(null)
  const [usingMockFallback, setUsingMockFallback] = useState(false)

  useEffect(() => {
    if (!useApi) return

    let cancelled = false
    setLoading(true)
    setError(null)
    setUsingMockFallback(false)
    // Luôn gọi đúng endpoint refresh để lấy dữ liệu mới nhất từ backend.
    // Target URL: http://localhost:8080/api/trending-deals?refresh=true
    fetchTrendingDeals(false, { refresh: true })
      .then(({ deals: rows, meta: m }) => {
        if (!cancelled) {
          setDeals(rows)
          setMeta(m)
          setError(null)
          setUsingMockFallback(false)
        }
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          const msg =
            e instanceof Error
              ? e.message
              : 'Không thể tải dữ liệu trending từ backend.'
          console.error('[useTrendingDeals] fetchTrendingDeals failed:', e)
          setError(msg)
          if (allowMockFallback) {
            // Fallback (opt-in) để UI không bị trắng khi CORS / URL / network lỗi.
            setDeals(mockTrendingDealCandidates)
            setMeta(null)
            setUsingMockFallback(true)
          } else {
            setDeals([])
            setMeta(null)
            setUsingMockFallback(false)
          }
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [useApi, allowMockFallback])

  return { deals, loading, meta, useApi, error, usingMockFallback }
}
