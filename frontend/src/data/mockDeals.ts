import type { Deal, DealSection } from '../types/deal';
import type { PlatformPrice, Product } from '../types/product';
import type { TrendingDealDto } from '../types/trendingDeal';
import { mockProducts } from './mockProducts';

function productById(id: number): Product {
  const p = mockProducts.find((x) => x.id === id);
  if (!p) throw new Error(`mockProducts thiếu id ${id}`);
  return p;
}

/** Một listing / nền tảng — dealScore vẫn gồm popularity & freshness (ẩn trên UI). */
function listingFromPlatform(
  product: Product,
  platform: PlatformPrice,
  listingId: string,
  productBadge: string,
  productPinned: boolean,
): TrendingDealDto {
  const org = platform.originalPrice;
  const fin = platform.finalPrice;
  const discountScore =
    org > 0 ? Math.min(1, Math.max(0, (org - fin) / org)) : 0;
  const trendScore = product.insight.isLowest90Days
    ? 0.88
    : product.insight.isLowest30Days
      ? 0.72
      : 0.45;
  const trustScore = platform.isOfficial ? 0.9 : 0.58;
  const popularityScore = Math.min(1, platform.soldCount / 10000);
  const freshnessScore = 0.94;
  const dealScore =
    0.45 * discountScore +
    0.25 * trendScore +
    0.15 * trustScore +
    0.1 * popularityScore +
    0.05 * freshnessScore;
  const discountPercent = org > 0 ? ((org - fin) / org) * 100 : 0;
  const pinned =
    productPinned &&
    platform.isOfficial &&
    platform.platform === 'Shopee';

  return {
    listingId,
    productId: String(product.id),
    variantKey: product.model,
    category: product.category,
    productName: product.name,
    imageUrl: product.images[0] ?? null,
    platformName: `${platform.platform} · ${platform.shopName}`,
    currentPrice: fin,
    originalPrice: org,
    discountPercent,
    dealScore,
    badge: productBadge,
    explanation: product.insight.summary,
    pinned,
    discountScore,
    trendScore,
    trustScore,
    popularityScore,
    freshnessScore,
  };
}

const TRENDING_PRODUCT_META: Record<
  number,
  { badge: string; pinned: boolean }
> = {
  1: { badge: 'HOT', pinned: false },
  2: { badge: 'PINNED', pinned: true },
  3: { badge: 'DEAL', pinned: false },
};

/** Ứng viên thô: mọi sàn — logic nhóm / xếp hạng ở `prepareTrendingDealGroups` */
export function buildMockTrendingDealCandidates(): TrendingDealDto[] {
  const out: TrendingDealDto[] = [];
  for (const id of [1, 2, 3] as const) {
    const p = productById(id);
    const m = TRENDING_PRODUCT_META[id];
    p.platforms.forEach((pf, i) => {
      out.push(
        listingFromPlatform(
          p,
          pf,
          `trending-${id}-plat-${i}`,
          m.badge,
          m.pinned,
        ),
      );
    });
  }
  return out;
}

export const mockTrendingDealCandidates = buildMockTrendingDealCandidates();

export const mockDeals: Deal[] = [
  {
    id: 'deal-1',
    productId: 1,
    type: 'trending',
    title: 'Top deal tai nghe hôm nay',
    subtitle: 'Giá thấp nhất 90 ngày',
    discountPercent: 18,
    currentPrice: 6990000,
    previousPrice: 8490000,
    score: 95,
    createdAt: '2026-04-10T09:20:00Z',
  },
  {
    id: 'deal-2',
    productId: 2,
    type: 'real-discount',
    title: 'Deal thật mỹ phẩm',
    subtitle: 'Thấp hơn trung bình 30 ngày 11%',
    discountPercent: 21,
    currentPrice: 489000,
    previousPrice: 620000,
    score: 93,
    createdAt: '2026-04-10T09:21:00Z',
  },
  {
    id: 'deal-3',
    productId: 3,
    type: 'suspicious-discount',
    title: 'Giảm sâu nhưng cần kiểm tra',
    subtitle: 'Có dấu hiệu tăng giá trước sale',
    discountPercent: 43,
    currentPrice: 3990000,
    previousPrice: 6990000,
    score: 72,
    createdAt: '2026-04-10T09:15:00Z',
  },
  {
    id: 'deal-4',
    productId: 2,
    type: 'near-historic-low',
    title: 'Sắp chạm đáy lịch sử',
    subtitle: 'Giá rất sát mức thấp nhất 90 ngày',
    discountPercent: 21,
    currentPrice: 489000,
    previousPrice: 620000,
    score: 90,
    createdAt: '2026-04-10T09:21:00Z',
  },
];

export const mockDealSections: DealSection[] = [
  {
    id: 'section-1',
    title: 'Trending deals hôm nay',
    subtitle: 'Các deal đang được quan tâm nhiều nhất',
    type: 'trending',
    dealIds: ['deal-1'],
  },
  {
    id: 'section-2',
    title: 'Deal thật sự',
    subtitle: 'Giảm giá tốt so với lịch sử',
    type: 'real-discount',
    dealIds: ['deal-2'],
  },
  {
    id: 'section-3',
    title: 'Deal nghi ảo',
    subtitle: 'Cần cân nhắc trước khi mua',
    type: 'suspicious-discount',
    dealIds: ['deal-3'],
  },
  {
    id: 'section-4',
    title: 'Sắp chạm đáy lịch sử',
    subtitle: 'Có thể mua ngay hoặc đặt alert',
    type: 'near-historic-low',
    dealIds: ['deal-4'],
  },
];