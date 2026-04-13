import { useEffect, useState } from 'react'
import { fetchTrendingDeals, resolveUseTrendingApi } from '../api/trendingDeals'
import { mockTrendingDealCandidates } from '../data/mockDeals'
import type { TrendingDealDto, TrendingDealsApiMeta } from '../types/trendingDeal'

export function useTrendingDeals() {
  const useApi = resolveUseTrendingApi()
  const [deals, setDeals] = useState<TrendingDealDto[] | null>(
    useApi ? null : mockTrendingDealCandidates,
  )
  const [meta, setMeta] = useState<TrendingDealsApiMeta | null>(null)
  const [loading, setLoading] = useState(useApi)

  useEffect(() => {
    if (!useApi) return

    let cancelled = false
    setLoading(true)
    fetchTrendingDeals(true)
      .then(({ deals: rows, meta: m }) => {
        if (!cancelled) {
          // DB trống (API trả []): vẫn hiển thị mock để demo UI.
          if (rows.length > 0) {
            setDeals(rows)
            setMeta(m)
          } else {
            setDeals(mockTrendingDealCandidates)
            setMeta(null)
          }
        }
      })
      .catch(() => {
        if (!cancelled) {
          setDeals(mockTrendingDealCandidates)
          setMeta(null)
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [useApi])

  return { deals, loading, meta, useApi }
}
