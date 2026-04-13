import { Heart, MoveUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import Badge from '../common/Badge';
import PlatformPill from '../common/PlatformPill';
import type { Product } from '../../types/product';

const FONT_STACK = {
  serif: '"Times New Roman", Georgia, serif',
  sans:
    'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
} as const;

type ProductCompareCardProps = {
  product: Product;
};

const formatPrice = (price: number): string =>
  new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(price);

const getBestOffer = (product: Product) =>
  [...product.platforms].sort((a, b) => a.finalPrice - b.finalPrice)[0];

const getWorstOffer = (product: Product) =>
  [...product.platforms].sort((a, b) => b.finalPrice - a.finalPrice)[0];

export default function ProductCompareCard({
  product,
}: ProductCompareCardProps) {
  const bestOffer = getBestOffer(product);
  const worstOffer = getWorstOffer(product);
  const spread = worstOffer.finalPrice - bestOffer.finalPrice;

  const topBadges: Array<{
    key: string;
    variant: 'brand' | 'soft' | 'warning' | 'danger';
    label: string;
  }> = [];

  if (product.insight?.isFakeDiscountRisk ?? false) {
    topBadges.push({
      key: 'real-deal',
      variant: 'brand',
      label: 'Deal tuyển chọn',
    });
  }

  if (product.insight?.isLowest90Days ?? false) {
    topBadges.push({
      key: 'lowest-90',
      variant: 'warning',
      label: 'Giá đẹp 90 ngày',
    });
  } else if (product.insight?.isLowest30Days ?? false) {
    topBadges.push({
      key: 'lowest-30',
      variant: 'soft',
      label: 'Giá đẹp 30 ngày',
    });
  }

  if ((product.insight?.isFakeDiscountRisk ?? false) && topBadges.length < 2) {
    topBadges.push({
      key: 'risk',
      variant: 'danger',
      label: 'Cần theo dõi thêm',
    });
  }

  return (
    <article className="group rounded-[34px] border border-[#DDD2C6] bg-[#F8F4EE] p-7 shadow-[0_10px_30px_rgba(33,24,19,0.06)] transition-all duration-500 hover:-translate-y-0.5 hover:shadow-[0_16px_40px_rgba(33,24,19,0.08)]">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <Link to={`/product/${product.id}`} className="flex min-w-0 gap-5 lg:flex-1">
          <div className="relative h-36 w-28 shrink-0 overflow-hidden rounded-[26px] bg-[#ECE4DA]">
            <img
              src={product.images}
              alt={product.name}
              className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
            />

            <div className="absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-white/10" />

            <button
              type="button"
              className="absolute right-3 top-3 rounded-full border border-white/60 bg-[#F7F2EC]/88 p-2.5 text-[#6D6258] shadow-[0_8px_20px_rgba(33,24,19,0.08)] backdrop-blur-md transition hover:text-[#2F241F]"
              aria-label="Lưu sản phẩm"
            >
              <Heart size={14} />
            </button>
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-[10px] uppercase tracking-[0.16em] text-[#8D7663]">
              {product.brand}
            </p>

            <h3
              className="mt-3 line-clamp-2 text-[1.72rem] leading-[1.12] tracking-[-0.025em] text-[#241B17] transition-colors duration-300 group-hover:text-[#3A2B23]"
              style={{ fontFamily: FONT_STACK.serif }}
            >
              {product.name}
            </h3>

            <p className="mt-3 text-sm text-[#74685F]">
              {product.rating} ·{(product.reviews ?? 0).toLocaleString('vi-VN')}reviews
            </p>

            {topBadges.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {topBadges.slice(0, 2).map((badge) => (
                  <Badge key={badge.key} variant={badge.variant}>
                    {badge.label}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </Link>

        <div className="flex shrink-0 flex-col gap-3 lg:items-end">
          <p className="text-sm tracking-[0.01em] text-[#9A8A7A]">
            Giá tốt nhất hiện tại
          </p>

          <div className="flex flex-wrap items-center gap-3 lg:justify-end">
            <span className="text-[2.15rem] font-semibold leading-none tracking-[-0.045em] text-[#241B17]">
              {formatPrice(bestOffer.finalPrice)}
            </span>
            <PlatformPill platform={bestOffer.platform} />
          </div>

          {spread > 0 && (
            <p className="text-sm text-[#7A5D49] lg:text-right">
              Tiết kiệm {formatPrice(spread)} so với nơi đắt nhất
            </p>
          )}

          <Link
            to={`/product/${product.id}`}
            className="mt-1 inline-flex items-center gap-2 self-start rounded-full border border-[#2A211D] bg-[#2A211D] px-5 py-3 text-sm font-medium text-[#F6F1EA] transition hover:bg-[#3A2D28] hover:border-[#3A2D28] lg:self-end"
          >
            Xem chi tiết
            <MoveUpRight size={16} />
          </Link>
        </div>
      </div>
    </article>
  );
}