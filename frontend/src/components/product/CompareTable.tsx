import React from 'react';
import { MoveUpRight, ShieldCheck } from 'lucide-react';
import Badge from '../common/Badge';
import PlatformPill from '../common/PlatformPill';
import type { PlatformPrice } from '../../types/product';

type CompareTableProps = {
  items: PlatformPrice[];
};

const formatPrice = (price: number): string =>
  new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(price);

const formatRelativeTime = (dateString: string): string => {
  const input = new Date(dateString).getTime();
  const now = new Date('2026-04-10T10:00:00Z').getTime();
  const diffMinutes = Math.max(1, Math.floor((now - input) / 60000));

  if (diffMinutes < 60) return `${diffMinutes} phút trước`;
  const hours = Math.floor(diffMinutes / 60);
  return `${hours} giờ trước`;
};

export default function CompareTable({ items }: CompareTableProps) {
  const sorted = [...items].sort((a, b) => a.finalPrice - b.finalPrice);
  const bestPrice = sorted[0]?.finalPrice ?? 0;

  return (
    <div className="overflow-hidden rounded-[32px] border border-stone-200 bg-white shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
      <div className="border-b border-stone-100 px-6 py-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-stone-400">
          Compare table
        </p>
        <h2 className="mt-2 text-xl font-semibold text-stone-900">
          So sánh giá chi tiết theo sàn
        </h2>
      </div>

      <div className="hidden overflow-x-auto lg:block">
        <table className="min-w-full text-left">
          <thead>
            <tr className="border-b border-stone-100 bg-[#FCFBF8] text-[11px] uppercase tracking-[0.18em] text-stone-400">
              <th className="px-6 py-4">Sàn / Shop</th>
              <th className="px-4 py-4">Giá hiện tại</th>
              <th className="px-4 py-4">Voucher</th>
              <th className="px-4 py-4">Ship</th>
              <th className="px-4 py-4">Tổng thanh toán</th>
              <th className="px-4 py-4">Tồn kho</th>
              <th className="px-4 py-4">Cập nhật</th>
              <th className="px-6 py-4 text-right">CTA</th>
            </tr>
          </thead>

          <tbody>
            {sorted.map((item) => {
              const isBest = item.finalPrice === bestPrice;

              return (
                <tr
                  key={`${item.platform}-${item.shopName}`}
                  className={`border-b border-stone-100 align-top transition hover:bg-[#FCFBF8] ${
                    isBest ? 'bg-[#FFF8FA]' : ''
                  }`}
                >
                  <td className="px-6 py-5">
                    <div className="space-y-2">
                      <PlatformPill platform={item.platform} />
                      <div>
                        <p className="font-semibold text-stone-900">{item.shopName}</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {item.isOfficial && (
                            <Badge variant="success">
                              <span className="mr-1 inline-flex">
                                <ShieldCheck size={12} />
                              </span>
                              Official
                            </Badge>
                          )}
                          {isBest && <Badge variant="brand">Giá tốt nhất</Badge>}
                        </div>
                      </div>
                    </div>
                  </td>

                  <td className="px-4 py-5">
                    <div className="space-y-1">
                      <p className="text-lg font-semibold tracking-tight text-stone-900">
                        {formatPrice(item.currentPrice)}
                      </p>
                      <p className="text-sm text-stone-300 line-through">
                        {formatPrice(item.originalPrice)}
                      </p>
                    </div>
                  </td>

                  <td className="px-4 py-5 text-sm text-stone-600">
                    -{formatPrice(item.voucherDiscount)}
                  </td>

                  <td className="px-4 py-5 text-sm text-stone-600">
                    {formatPrice(item.shippingFee)}
                  </td>

                  <td className="px-4 py-5">
                    <p className="text-lg font-semibold tracking-tight text-[#A06F73]">
                      {formatPrice(item.finalPrice)}
                    </p>
                  </td>

                  <td className="px-4 py-5">
                    {item.inStock ? (
                      <Badge variant="success">Còn hàng</Badge>
                    ) : (
                      <Badge variant="danger">Hết hàng</Badge>
                    )}
                  </td>

                  <td className="px-4 py-5 text-sm text-stone-500">
                    {formatRelativeTime(item.lastCrawledAt)}
                  </td>

                  <td className="px-6 py-5 text-right">
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 rounded-full bg-stone-900 px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-90"
                    >
                      Mua ngay
                      <MoveUpRight size={15} />
                    </a>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="space-y-4 p-4 lg:hidden">
        {sorted.map((item) => {
          const isBest = item.finalPrice === bestPrice;

          return (
            <div
              key={`${item.platform}-${item.shopName}-mobile`}
              className={`rounded-[24px] border p-4 ${
                isBest
                  ? 'border-[#D7B6BA] bg-[#FFF8FA]'
                  : 'border-stone-200 bg-[#FCFBF8]'
              }`}
            >
              <div className="mb-3 flex items-start justify-between gap-3">
                <div className="space-y-2">
                  <PlatformPill platform={item.platform} />
                  <p className="font-semibold text-stone-900">{item.shopName}</p>
                </div>
                {isBest && <Badge variant="brand">Tốt nhất</Badge>}
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-stone-400">Giá hiện tại</p>
                  <p className="font-semibold text-stone-900">
                    {formatPrice(item.currentPrice)}
                  </p>
                </div>
                <div>
                  <p className="text-stone-400">Tổng thanh toán</p>
                  <p className="font-semibold text-[#A06F73]">
                    {formatPrice(item.finalPrice)}
                  </p>
                </div>
                <div>
                  <p className="text-stone-400">Voucher</p>
                  <p className="text-stone-700">-{formatPrice(item.voucherDiscount)}</p>
                </div>
                <div>
                  <p className="text-stone-400">Ship</p>
                  <p className="text-stone-700">{formatPrice(item.shippingFee)}</p>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between">
                <div>
                  {item.inStock ? (
                    <Badge variant="success">Còn hàng</Badge>
                  ) : (
                    <Badge variant="danger">Hết hàng</Badge>
                  )}
                </div>

                <a
                  href={item.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-full bg-stone-900 px-4 py-2.5 text-sm font-medium text-white"
                >
                  Mua
                  <MoveUpRight size={15} />
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}