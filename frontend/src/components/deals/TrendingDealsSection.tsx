import { useMemo, useState } from 'react'
import { Loader2 } from 'lucide-react'
import {
  TRENDING_DEAL_DISCLAIMER,
  TRENDING_DEAL_FONT_STACK,
} from '../../util/trendingDealFormat'
import { prepareTrendingDealGroups } from '../../util/trendingDealPrepare'
import { useTrendingDeals } from '../../util/useTrendingDeals'
import { TrendingDealGroupBlock } from './TrendingDealGroupBlock'
import { TrendingDealRow } from './TrendingDealRow'

export default function TrendingDealsSection() {
  const { deals, loading } = useTrendingDeals()
  const [expandedKeys, setExpandedKeys] = useState<Record<string, boolean>>({})

  const groups = useMemo(
    () => prepareTrendingDealGroups(deals ?? []),
    [deals],
  )

  const list = deals ?? []

  return (
    <section
      className="mb-14 rounded-[34px] border border-[#DDD2C6] bg-white/90 p-8 shadow-[0_14px_35px_rgba(15,23,42,0.05)]"
      style={{ fontFamily: TRENDING_DEAL_FONT_STACK.sans }}
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="w-full min-w-0">
          <h2
            className="text-2xl text-stone-900 md:text-3xl"
            style={{ fontFamily: TRENDING_DEAL_FONT_STACK.serif }}
          >
            Trending deals
          </h2>
          <p className="mt-3 text-balance text-xs leading-relaxed text-stone-500 sm:text-sm">
            {TRENDING_DEAL_DISCLAIMER}
          </p>
        </div>
      </div>

      {loading && list.length === 0 && (
        <p className="mt-8 flex items-center gap-2 text-sm text-stone-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Đang tải trending…
        </p>
      )}

      {groups.length > 0 && (
        <ul className="mt-8 space-y-6">
          {groups.map((group) => (
            <TrendingDealGroupBlock
              key={group.groupKey}
              group={group}
              expanded={Boolean(expandedKeys[group.groupKey])}
              onToggle={() =>
                setExpandedKeys((prev) => ({
                  ...prev,
                  [group.groupKey]: !prev[group.groupKey],
                }))
              }
            />
          ))}
        </ul>
      )}

      {!loading && groups.length === 0 && list.length > 0 && (
        <ul className="mt-8 space-y-6">
          {list.map((d) => (
            <li key={d.listingId}>
              <TrendingDealRow d={d} />
            </li>
          ))}
        </ul>
      )}

      {!loading && groups.length === 0 && list.length === 0 && (
        <p className="mt-8 text-sm text-stone-500">Không có kết quả phù hợp.</p>
      )}
    </section>
  )
}
