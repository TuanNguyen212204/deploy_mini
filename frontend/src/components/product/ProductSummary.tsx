import React from 'react';
import { Bell, Heart, MoveUpRight } from 'lucide-react';
import Badge from '../common/Badge';
import PlatformPill from '../common/PlatformPill';
import type { Product } from '../../types/product';

const FONT_STACK = {
  serif: '"Times New Roman", Georgia, serif',
  sans:
    'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
} as const;

type ProductSummaryProps = {
  product: Product;
};

const formatPrice = (price: number): string =>
  new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(price);

export default function ProductSummary({ product }: ProductSummaryProps) {
  const bestOffer = [...product.platforms].sort(
    (a, b) => a.finalPrice - b.finalPrice,
  )[0];

  return (
    <div className="rounded-[34px] border border-stone-200/80 bg-white p-7 shadow-soft">
      <p className="text-[10px] uppercase tracking-[0.12em] text-[#8E6A72]">
        {product.brand}
      </p>

      <h1
        className="mt-4 text-[2.45rem] leading-[1.05] tracking-[-0.02em] text-stone-900 md:text-[2.95rem]"
        style={{ fontFamily: FONT_STACK.serif }}
      >
        {product.name}
      </h1>

      <div className="mt-5 flex flex-wrap items-center gap-3 text-sm text-stone-500">
        <span>
          {product.rating} · {product.reviews.toLocaleString('vi-VN')} reviews
        </span>

        {!product.insight.isFakeDiscountRisk ? (
          <Badge variant="brand">Đáng cân nhắc</Badge>
        ) : (
          <Badge variant="soft">Theo dõi thêm</Badge>
        )}
      </div>

      <div className="shadow-deep mt-8 rounded-[30px] bg-gradient-to-br from-[#F8F1F3] to-white p-6">
        <p className="text-[11px] uppercase tracking-[0.12em] text-stone-400">
          Giá đẹp nhất hiện tại
        </p>

        <div className="mt-3 flex flex-wrap items-end gap-3">
          <span className="text-[2.8rem] font-semibold tracking-[-0.03em] text-[#8E6A72]">
            {formatPrice(bestOffer.finalPrice)}
          </span>

          <span className="pb-2 text-sm text-stone-300 line-through">
            {formatPrice(bestOffer.originalPrice)}
          </span>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <PlatformPill platform={bestOffer.platform} />
          {bestOffer.isOfficial && <Badge variant="soft">Official</Badge>}
        </div>

        <div className="mt-5 rounded-[22px] border border-white/60 bg-white/70 px-4 py-4 shadow-[0_10px_24px_rgba(15,23,42,0.05)] backdrop-blur-sm">
          <p className="text-[10px] uppercase tracking-[0.12em] text-stone-400">
            Cửa hàng phù hợp
          </p>

          <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-stone-900">
                {bestOffer.shopName}
              </p>
              <p className="text-sm text-stone-500">
                {bestOffer.platform} · Ship {formatPrice(bestOffer.shippingFee)}
              </p>
            </div>

            <a
              href={bestOffer.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 text-sm font-medium text-[#8E6A72] transition hover:text-stone-900"
            >
              Đến cửa hàng
              <MoveUpRight size={15} />
            </a>
          </div>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <a
          href={bestOffer.url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center justify-center gap-2 rounded-full bg-[#1F1A17] px-6 py-4 text-sm font-medium text-white transition hover:opacity-90"
        >
          Mua tại {bestOffer.platform}
          <MoveUpRight size={16} />
        </a>

        <button
          type="button"
          className="inline-flex items-center justify-center gap-2 rounded-full border border-stone-200 bg-white px-5 py-4 text-sm font-medium text-stone-700 transition hover:text-[#8E6A72]"
        >
          <Bell size={16} />
          Đặt alert
        </button>

        <button
          type="button"
          className="inline-flex items-center justify-center gap-2 rounded-full border border-stone-200 bg-white px-5 py-4 text-sm font-medium text-stone-700 transition hover:text-[#8E6A72]"
        >
          <Heart size={16} />
          Lưu wishlist
        </button>
      </div>

      <p className="mt-6 text-sm leading-7 text-stone-500">
        {product.insight.summary}
      </p>
    </div>
  );
}