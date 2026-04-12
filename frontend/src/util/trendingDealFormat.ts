import type { TrendingDealDto, TrendingDealsApiMeta } from '../types/trendingDeal'

export const TRENDING_DEAL_FONT_STACK = {
  serif: '"Times New Roman", Georgia, serif',
  sans:
    'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
} as const

export const TRENDING_DEAL_PLACEHOLDER_IMG =
  'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=400&q=60'

export const TRENDING_DEAL_DISCLAIMER =
  'Giá deal được tính từ mức giá công khai hệ thống quan sát được. Giá thanh toán cuối cùng có thể thay đổi tùy voucher cá nhân và địa chỉ giao hàng.'

export function formatTrendingDealMeta(meta: TrendingDealsApiMeta): string {
  try {
    const computed = new Date(meta.computedAt)
    const next = new Date(meta.nextRefreshAfter)
    const mins = Math.round(meta.cacheTtlSeconds / 60)
    return `Snapshot backend: ${computed.toLocaleString('vi-VN')} — danh sách được cache tối đa ${mins} phút (làm mới tiếp theo ~ ${next.toLocaleString('vi-VN')}).`
  } catch {
    return ''
  }
}

export const TRENDING_DEAL_SCORE_PARTS: Array<{
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

export function formatTrendingDealVnd(n: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(n)
}

export function trendingDealBadgeClass(badge: string): string {
  const b = badge.toUpperCase()
  if (b === 'PINNED') {
    return 'bg-[#2A211D] text-[#F6F1EA] ring-1 ring-[#2A211D]'
  }
  if (b === 'HOT') {
    return 'bg-[#8E3B46]/12 text-[#7A2F38] ring-1 ring-[#D4A5AA]'
  }
  return 'bg-[#E8E0D6] text-[#5C5248] ring-1 ring-[#D4C9BC]'
}

export function trendingDealHasScoreBreakdown(d: TrendingDealDto): boolean {
  return TRENDING_DEAL_SCORE_PARTS.some((p) => d[p.key] != null)
}
