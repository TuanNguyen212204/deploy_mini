import type { TrendingDealDto } from '../types/trendingDeal'

export type TrendingDealGroup = {
  groupKey: string
  primary: TrendingDealDto
  alternates: TrendingDealDto[]
}

function groupKeyOf(d: TrendingDealDto): string {
  const v = d.variantKey ?? ''
  return `${d.productId}\0${v}`
}

/** Gỡ trùng trong cùng nhóm: ưu trust cao hơn, cùng trust thì giá thấp hơn. */
function compareTrustThenPrice(a: TrendingDealDto, b: TrendingDealDto): number {
  const ta = a.trustScore ?? 0
  const tb = b.trustScore ?? 0
  if (Math.abs(tb - ta) > 1e-9) return tb - ta
  return a.currentPrice - b.currentPrice
}

/**
 * Thứ tự đại diện nhóm: dealScore ↓, discountScore ↓, trustScore ↓,
 * cùng category thì giá thấp hơn trước.
 */
function comparePrimaryRank(a: TrendingDealDto, b: TrendingDealDto): number {
  const ds = (b.dealScore ?? 0) - (a.dealScore ?? 0)
  if (Math.abs(ds) > 1e-9) return ds
  const dd = (b.discountScore ?? 0) - (a.discountScore ?? 0)
  if (Math.abs(dd) > 1e-9) return dd
  const dt = (b.trustScore ?? 0) - (a.trustScore ?? 0)
  if (Math.abs(dt) > 1e-9) return dt
  const ca = a.category ?? ''
  const cb = b.category ?? ''
  if (ca && cb && ca === cb) return a.currentPrice - b.currentPrice
  return a.productId.localeCompare(b.productId)
}

function compareAlternateRank(a: TrendingDealDto, b: TrendingDealDto): number {
  return comparePrimaryRank(a, b)
}

/**
 * Nhóm theo productId + variantKey, chọn 1 đại diện đỉnh, còn lại là listing mở rộng.
 * Deal score vẫn dùng đủ thành phần (popularity, freshness…) từ từng DTO.
 */
export function prepareTrendingDealGroups(
  candidates: TrendingDealDto[],
): TrendingDealGroup[] {
  const byKey = new Map<string, TrendingDealDto[]>()
  for (const d of candidates) {
    const k = groupKeyOf(d)
    const arr = byKey.get(k) ?? []
    arr.push(d)
    byKey.set(k, arr)
  }

  const groups: TrendingDealGroup[] = []

  for (const [, rows] of byKey) {
    const sortedTrust = [...rows].sort(compareTrustThenPrice)
    const primary = sortedTrust[0]!
    const alternates = sortedTrust.slice(1).sort(compareAlternateRank).map((row) => ({
      ...row,
      badge: 'TRENDING',
      pinned: false,
    }))

    groups.push({
      groupKey: groupKeyOf(primary),
      primary,
      alternates,
    })
  }

  groups.sort((ga, gb) => comparePrimaryRank(ga.primary, gb.primary))

  return groups
}
