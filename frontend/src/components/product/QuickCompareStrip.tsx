import React from 'react';
import Badge from '../common/Badge';
import PlatformPill from '../common/PlatformPill';
import type { PlatformPrice } from '../../types/product';

type QuickCompareStripProps = {
  items: PlatformPrice[];
};

const formatPrice = (price: number): string =>
  new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(price);

export default function QuickCompareStrip({
  items,
}: QuickCompareStripProps) {
  const sorted = [...items].sort((a, b) => a.finalPrice - b.finalPrice);
  const best = sorted[0];

  return (
    <section>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-2xl">
          

          <h2 className="mt-1 text-[1.45rem] font-medium tracking-[-0.02em] text-stone-900">
            Nơi mua phù hợp
          </h2>

          <p className="mt-1 text-sm leading-6 text-stone-500">
            So sánh nhanh giá cuối cùng, cửa hàng và ưu đãi để chọn nơi mua phù hợp hơn.
          </p>
        </div>

        {best && (
          <p className="text-sm text-stone-500">
            Tốt nhất hiện tại:{' '}
            <span className="font-medium text-stone-800">{best.platform}</span>
          </p>
        )}
      </div>

      <div className="mt-5 overflow-x-auto pb-2">
        <div className="flex min-w-max gap-3 snap-x snap-mandatory">
          {sorted.map((item, index) => {
            const isBest = index === 0;

            return (
              <article
                key={`${item.platform}-${item.shopName}`}
                className={`w-[248px] shrink-0 snap-start rounded-[20px] border p-4 transition-all duration-200 ${
                  isBest
                    ? 'border-[#D9CEC1] bg-[#F6F0E8]'
                    : 'border-stone-200/70 bg-white'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <PlatformPill platform={item.platform} compact />
                    <p className="mt-2 truncate text-sm font-medium text-stone-900">
                      {item.shopName}
                    </p>
                  </div>

                  {isBest && (
                    <span className="rounded-full bg-[#E9DED1] px-2.5 py-1 text-[10px] font-medium text-[#5B4A3E]">
                      Tốt nhất
                    </span>
                  )}
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {item.isOfficial && <Badge variant="soft">Official</Badge>}
                </div>

                <div className="mt-4">
                  <p className="text-[1.35rem] font-semibold leading-none tracking-[-0.03em] text-stone-900">
                    {formatPrice(item.finalPrice)}
                  </p>

                  <div className="mt-2 space-y-1 text-[12px] leading-5 text-stone-500">
                    <p>Gốc {formatPrice(item.originalPrice)}</p>
                    <p>Voucher -{formatPrice(item.voucherDiscount)}</p>
                    <p>Ship {formatPrice(item.shippingFee)}</p>
                  </div>
                </div>

                <a
                  href={item.url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 inline-flex rounded-full border border-stone-200 px-3 py-2 text-[12px] font-medium text-stone-700 transition hover:text-stone-900"
                >
                  Xem nơi bán
                </a>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}