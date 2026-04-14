import { useEffect, useState } from 'react'
import { fetchTrendingDeals, resolveUseTrendingApi } from '../api/trendingDeals'
import { mockTrendingDealCandidates } from '../data/mockDeals'
import type { TrendingDealDto, TrendingDealsApiMeta } from '../types/trendingDeal'

export function useTrendingDeals() {
  const useApi = resolveUseTrendingApi()
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
    fetchTrendingDeals(true)
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
          // Fallback để UI không bị trắng khi CORS / URL / network lỗi.
          setDeals(mockTrendingDealCandidates)
          setMeta(null)
          setUsingMockFallback(true)
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [useApi])

  return { deals, loading, meta, useApi, error, usingMockFallback }
}
