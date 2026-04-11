import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown, ChevronUp, Loader2, ServerCrash } from 'lucide-react'

import { fetchTrendingDeals } from '../../api/trendingDeals'
import { mockTrendingDealCandidates } from '../../data/mockDeals'
import type { TrendingDealDto } from '../../types/trendingDeal'
import {
  prepareTrendingDealGroups,
  type TrendingDealGroup,
} from '../../util/trendingDealPrepare'

const FONT_STACK = {
  serif: '"Times New Roman", Georgia, serif',
  sans:
    'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
} as const

const PLACEHOLDER_IMG =
  'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=400&q=60'

const DISCLAIMER =
  'Giá deal được tính từ mức giá công khai hệ thống quan sát được. Giá thanh toán cuối cùng có thể thay đổi tùy voucher cá nhân và địa chỉ giao hàng.'

/** true = gọi API (UUID productId — chi tiết mock có thể không khớp); false = mock đồng bộ với trang sản phẩm */
const USE_TRENDING_API =
  String(import.meta.env.VITE_USE_TRENDING_API ?? '').toLowerCase() === 'true'

const SCORE_PARTS: Array<{
  key: keyof Pick<
    TrendingDealDto,
    'discountScore' | 'trendScore' | 'trustScore'
  >
  label: string
}> = [
  { key: 'discountScore', label: 'Giảm giá' },
  { key: 'trendScore', label: 'Xu hướng' },
  { key: 'trustScore', label: 'Tin cậy' },
]

function formatVnd(n: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(n)
}

function badgeStyle(badge: string): string {
  const b = badge.toUpperCase()
  if (b === 'PINNED') {
    return 'bg-[#2A211D] text-[#F6F1EA] ring-1 ring-[#2A211D]'
  }
  if (b === 'HOT') {
    return 'bg-[#8E3B46]/12 text-[#7A2F38] ring-1 ring-[#D4A5AA]'
  }
  return 'bg-[#E8E0D6] text-[#5C5248] ring-1 ring-[#D4C9BC]'
}

function hasScoreBreakdown(d: TrendingDealDto): boolean {
  return SCORE_PARTS.some((p) => d[p.key] != null)
}

function DealScoreBreakdown({ d }: { d: TrendingDealDto }) {
  if (!hasScoreBreakdown(d)) return null

  return (
    <div className="mt-3 rounded-xl border border-stone-200/60 bg-white/60 px-3 py-2.5">
      <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-stone-400">
        Thành phần điểm deal
      </p>
      <ul className="mt-2 space-y-1.5">
        {SCORE_PARTS.map(({ key, label }) => {
          const v = d[key]
          if (v == null) return null
          const pct = Math.round(Math.min(1, Math.max(0, v)) * 100)
          return (
            <li key={key} className="flex items-center gap-2 text-[11px]">
              <span className="w-[4.5rem] shrink-0 text-stone-500">{label}</span>
              <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-stone-200/80">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#B89AA1] to-[#8E6A72]"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="w-8 shrink-0 text-right tabular-nums text-stone-600">
                {pct}%
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function TrendingDealRow({
  d,
  nested = false,
}: {
  d: TrendingDealDto
  nested?: boolean
}) {
  return (
    <div className={nested ? 'max-w-full' : ''}>
      <Link
        to={`/product/${d.productId}`}
        className={`group flex flex-col gap-4 rounded-2xl border border-stone-200/90 bg-[#FCF8F4] p-5 transition-all duration-300 ease-out hover:-translate-y-1.5 hover:border-[#C9A9B0] hover:bg-[#FFFCF8] hover:shadow-[0_22px_48px_rgba(44,36,31,0.12)] hover:ring-2 hover:ring-[#E5CCD2]/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8E6A72] sm:flex-row sm:items-stretch ${
          nested
            ? 'shadow-[0_1px_8px_rgba(44,36,31,0.04)] hover:translate-y-0 hover:shadow-md'
            : 'shadow-[0_2px_12px_rgba(44,36,31,0.04)]'
        }`}
      >
        <div className="flex min-w-0 flex-1 gap-4 sm:items-center">
          <div
            className={`flex shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-stone-100/80 ring-1 ring-stone-200/80 transition-[box-shadow] duration-300 group-hover:ring-[#D4A5AA]/70 ${
              nested ? 'h-20 w-20' : 'h-24 w-24'
            }`}
          >
            <img
              src={d.imageUrl || PLACEHOLDER_IMG}
              alt=""
              className="h-full w-full object-cover object-center transition duration-300 group-hover:scale-[1.03]"
            />
          </div>
          <div className="min-w-0 flex-1">
            <span
              className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${badgeStyle(d.badge)}`}
            >
              {d.badge}
            </span>
            <h3
              className="mt-2 line-clamp-2 text-lg text-stone-900 transition-colors group-hover:text-[#5C3D45]"
              style={{ fontFamily: FONT_STACK.serif }}
            >
              {d.productName}
            </h3>
            <p className="mt-1 text-xs text-stone-500">{d.platformName}</p>
            <p className="mt-2 text-xs text-stone-600">{d.explanation}</p>
            <DealScoreBreakdown d={d} />
          </div>
        </div>
        <div className="shrink-0 text-right sm:flex sm:min-w-[156px] sm:flex-col sm:justify-center sm:border-l sm:border-stone-200/60 sm:pl-5">
          <div>
            <p className="text-xs text-stone-500">Giá tốt nhất</p>
            <p className="text-[10px] text-stone-400">Đã gồm voucher và phí ship</p>
            <p className="mt-1 text-lg font-semibold text-stone-900">
              {formatVnd(d.currentPrice)}
            </p>
            {d.originalPrice != null && d.originalPrice > 0 && (
              <p className="text-xs text-stone-400 line-through">
                {formatVnd(d.originalPrice)}
              </p>
            )}
            <p className="mt-1 text-[11px] text-stone-500">
              Deal score:{' '}
              {Math.round(Math.min(1, Math.max(0, d.dealScore)) * 100)}%
              {d.discountPercent > 0 && (
                <> · Giảm ~{Math.round(d.discountPercent)}%</>
              )}
            </p>
          </div>
        </div>
      </Link>
    </div>
  )
}

function TrendingDealGroupBlock({
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

export default function TrendingDealsSection() {
  const [deals, setDeals] = useState<TrendingDealDto[] | null>(
    USE_TRENDING_API ? null : mockTrendingDealCandidates,
  )
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(USE_TRENDING_API)
  const [expandedKeys, setExpandedKeys] = useState<Record<string, boolean>>({})

  useEffect(() => {
    if (!USE_TRENDING_API) return

    let cancelled = false
    setLoading(true)
    setError(null)
    fetchTrendingDeals(true)
      .then((rows) => {
        if (!cancelled) setDeals(rows)
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Không tải được dữ liệu')
          setDeals(mockTrendingDealCandidates)
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  const groups = useMemo(
    () => prepareTrendingDealGroups(deals ?? []),
    [deals],
  )

  const list = deals ?? []

  return (
    <section
      className="mb-14 rounded-[34px] border border-[#DDD2C6] bg-white/90 p-8 shadow-[0_14px_35px_rgba(15,23,42,0.05)]"
      style={{ fontFamily: FONT_STACK.sans }}
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="w-full min-w-0">
          <h2
            className="text-2xl text-stone-900 md:text-3xl"
            style={{ fontFamily: FONT_STACK.serif }}
          >
            Trending deals
          </h2>
          <p className="mt-3 text-balance text-xs leading-relaxed text-stone-500 sm:text-sm">
            {DISCLAIMER}
          </p>
          {USE_TRENDING_API && (
            <p className="mt-2 text-xs text-stone-500">
              Đang lấy từ API (expand=true); nếu lỗi sẽ dùng mock. Bật/tắt bằng{' '}
              <code className="rounded bg-stone-100 px-1 py-0.5">VITE_USE_TRENDING_API</code>.
            </p>
          )}
        </div>
      </div>

      {loading && list.length === 0 && (
        <p className="mt-8 flex items-center gap-2 text-sm text-stone-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Đang tải trending…
        </p>
      )}

      {error && (
        <div className="mt-6 flex gap-3 rounded-2xl border border-amber-200/80 bg-amber-50/80 p-4 text-sm text-amber-950">
          <ServerCrash className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="font-medium">API trending không khả dụng</p>
            <p className="mt-1 text-amber-900/80">{error}</p>
            <p className="mt-2 text-xs text-amber-900/75">
              Đang hiển thị bản mock (đủ listing để thử mở rộng).
            </p>
          </div>
        </div>
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

      {!loading && groups.length === 0 && (
        <p className="mt-8 text-sm text-stone-500">Chưa có deal trending để hiển thị.</p>
      )}
    </section>
  )
}
