import { ChevronDown, ChevronUp } from 'lucide-react'
import type { TrendingDealGroup } from '../../util/trendingDealPrepare'
import { TrendingDealRow } from './TrendingDealRow'

export function TrendingDealGroupBlock({
  group,
  expanded,
  onToggle,
}: {
  group: TrendingDealGroup
  expanded: boolean
  onToggle: () => void
}) {
  const n = group.alternates.length

  return (
    <li className="space-y-3">
      <TrendingDealRow d={group.primary} />
      {n > 0 && (
        <div className="pl-1 sm:pl-2">
          <button
            type="button"
            onClick={onToggle}
            className="inline-flex items-center gap-1.5 rounded-full border border-stone-200/90 bg-white/90 px-4 py-2 text-xs font-medium text-stone-600 transition hover:border-[#C9A9B0] hover:bg-[#FCF8F4] hover:text-stone-900"
          >
            {expanded ? (
              <>
                Thu gọn
                <ChevronUp className="h-3.5 w-3.5" />
              </>
            ) : (
              <>
                Xem thêm {n} listing cùng sản phẩm
                <ChevronDown className="h-3.5 w-3.5" />
              </>
            )}
          </button>
          {expanded && (
            <ul className="mt-3 space-y-3 border-l-2 border-[#E8DDD4] pl-4 sm:pl-5">
              {group.alternates.map((alt) => (
                <li key={alt.listingId}>
                  <TrendingDealRow d={alt} nested />
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </li>
  )
}
