import { Link } from 'react-router-dom'
import type { TrendingDealDto } from '../../types/trendingDeal'
import {
  TRENDING_DEAL_FONT_STACK,
  formatTrendingDealVnd,
  trendingDealBadgeClass,
} from '../../util/trendingDealFormat'
import { TrendingDealScoreBreakdown } from './TrendingDealScoreBreakdown'
import { useState } from 'react'

export function TrendingDealRow({
  d,
  nested = false,
  onImageError,
}: {
  d: TrendingDealDto
  nested?: boolean
  onImageError?: (listingId: string) => void
}) {
  const [imgBroken, setImgBroken] = useState(false)
  const hasImg = Boolean(d.imageUrl && String(d.imageUrl).trim().length > 0)
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
            {hasImg && !imgBroken ? (
              <img
                src={String(d.imageUrl)}
                alt=""
                onError={() => {
                  setImgBroken(true)
                  onImageError?.(d.listingId)
                }}
                className="h-full w-full object-cover object-center transition duration-300 group-hover:scale-[1.03]"
              />
            ) : (
              <span className="px-2 text-center text-[11px] font-medium text-stone-500">
                Lỗi hiển thị
              </span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <span
              className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${trendingDealBadgeClass(d.badge)}`}
            >
              {d.badge}
            </span>
            <h3
              className="mt-2 line-clamp-2 text-lg text-stone-900 transition-colors group-hover:text-[#5C3D45]"
              style={{ fontFamily: TRENDING_DEAL_FONT_STACK.serif }}
            >
              {d.productName}
            </h3>
            <p className="mt-1 text-xs text-stone-500">{d.platformName}</p>
            <p className="mt-2 whitespace-pre-line text-xs text-stone-600">
              {d.explanation}
            </p>
            <TrendingDealScoreBreakdown d={d} />
          </div>
        </div>
        <div className="shrink-0 text-right sm:flex sm:min-w-[156px] sm:flex-col sm:justify-center sm:border-l sm:border-stone-200/60 sm:pl-5">
          <div>
            <p className="text-xs text-stone-500">Giá tốt nhất</p>
            <p className="text-[10px] text-stone-400">Đã gồm voucher và phí ship</p>
            <p className="mt-1 text-lg font-semibold text-stone-900">
              {formatTrendingDealVnd(d.currentPrice)}
            </p>
            {d.originalPrice != null && d.originalPrice > 0 && (
              <p className="text-xs text-stone-400 line-through">
                {formatTrendingDealVnd(d.originalPrice)}
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
