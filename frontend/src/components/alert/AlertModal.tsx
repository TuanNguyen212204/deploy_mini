import React, { useEffect, useState } from 'react';
import { Bell, CheckCheck, X } from 'lucide-react';
import Badge from '../common/Badge';
import type { Platform } from '../../types/product';
import type { AlertChannel } from '../../types/alert';

type AlertModalProps = {
  isOpen: boolean;
  onClose: () => void;
  productName?: string;
  defaultPrice?: number;
  defaultPlatform?: Platform | 'all';
};

const platformOptions: Array<Platform | 'all'> = [
  'all',
  'Shopee',
  'Lazada',
  'Tiki',
  'Sendo',
];

const channelOptions: AlertChannel[] = ['email', 'push', 'zalo'];

const formatPrice = (price: number): string =>
  new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(price);

export default function AlertModal({
  isOpen,
  onClose,
  productName,
  defaultPrice = 0,
  defaultPlatform = 'all',
}: AlertModalProps) {
  const [targetPrice, setTargetPrice] = useState(
    defaultPrice ? String(defaultPrice) : '',
  );
  const [platform, setPlatform] = useState<Platform | 'all'>(defaultPlatform);
  const [channel, setChannel] = useState<AlertChannel>('email');
  const [frequency, setFrequency] = useState('Ngay khi chạm ngưỡng');
  const [note, setNote] = useState('');
  const [isCreated, setIsCreated] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setTargetPrice(defaultPrice ? String(defaultPrice) : '');
    setPlatform(defaultPlatform);
    setChannel('email');
    setFrequency('Ngay khi chạm ngưỡng');
    setNote('');
    setIsCreated(false);
  }, [defaultPlatform, defaultPrice, isOpen]);

  if (!isOpen) return null;

  const parsedPrice = Number(targetPrice.replace(/[^\d]/g, '') || 0);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setIsCreated(true);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-stone-950/35 p-4 backdrop-blur-md">
      <div className="glass w-full max-w-2xl rounded-[32px] p-6 shadow-[0_30px_80px_rgba(15,23,42,0.18)] md:p-8">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <div className="mb-3 flex flex-wrap gap-2">
              <Badge variant="brand">Price alert</Badge>
              <Badge variant="soft">Mock flow</Badge>
            </div>

            <h2 className="text-2xl font-semibold tracking-[-0.02em] text-stone-900">
              Đặt cảnh báo giá
            </h2>

            <p className="mt-2 text-sm leading-7 text-stone-500">
              {productName
                ? `Theo dõi giá cho ${productName} và nhận thông báo khi sản phẩm chạm ngưỡng bạn mong muốn.`
                : 'Theo dõi giá và nhận thông báo khi chạm ngưỡng mong muốn.'}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/50 bg-white/60 p-3 text-stone-500 shadow-[0_8px_20px_rgba(15,23,42,0.06)] backdrop-blur-md transition hover:text-stone-900"
          >
            <X size={18} />
          </button>
        </div>

        {isCreated ? (
          <div className="scale-100 animate-[pop_0.3s_ease] rounded-[28px] border border-[#D7E8C7] bg-[linear-gradient(135deg,rgba(255,255,255,0.88),rgba(243,250,223,0.92))] p-6 shadow-[0_18px_40px_rgba(94,122,47,0.10)]">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full border border-white/60 bg-white/75 text-[#5E7A2F] shadow-[0_10px_24px_rgba(94,122,47,0.12)] backdrop-blur-md">
                <CheckCheck size={18} />
              </div>

              <div>
                <h3 className="text-lg font-semibold tracking-[-0.01em] text-stone-900">
                  Alert đã được tạo
                </h3>

                <p className="mt-1 text-sm text-stone-600">
                  Mức giá mục tiêu:{' '}
                  <span className="font-medium text-stone-900">
                    {formatPrice(parsedPrice)}
                  </span>{' '}
                  · Kênh nhận:{' '}
                  <span className="font-medium text-stone-900">{channel}</span>
                </p>
              </div>
            </div>

            <div className="mt-5 rounded-[22px] border border-white/50 bg-white/60 px-4 py-4 backdrop-blur-sm">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-500">
                Thiết lập đã lưu
              </p>
              <p className="mt-2 text-sm leading-7 text-stone-700">
                Hệ thống sẽ theo dõi mức giá trên{' '}
                <span className="font-medium text-stone-900">
                  {platform === 'all' ? 'mọi sàn phù hợp' : platform}
                </span>{' '}
                và gửi thông báo theo tần suất{' '}
                <span className="font-medium text-stone-900">{frequency}</span>.
              </p>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="rounded-full bg-stone-900 px-5 py-3 text-sm font-medium text-white transition hover:opacity-90"
              >
                Đóng
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-400">
                  Giá mong muốn
                </label>
                <input
                  value={targetPrice}
                  onChange={(e) => setTargetPrice(e.target.value)}
                  placeholder="Ví dụ: 6500000"
                  className="w-full rounded-[22px] border border-white/50 bg-white/60 px-4 py-4 text-sm text-stone-900 outline-none backdrop-blur-sm transition focus:border-[#D7B6BA]"
                />
              </div>

              <div>
                <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-400">
                  Theo dõi nền tảng
                </label>
                <select
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value as Platform | 'all')}
                  className="w-full rounded-[22px] border border-white/50 bg-white/60 px-4 py-4 text-sm text-stone-900 outline-none backdrop-blur-sm transition focus:border-[#D7B6BA]"
                >
                  {platformOptions.map((item) => (
                    <option key={item} value={item}>
                      {item === 'all' ? 'Tất cả sàn' : item}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-400">
                  Kênh nhận thông báo
                </label>

                <div className="flex flex-wrap gap-2">
                  {channelOptions.map((item) => {
                    const isActive = channel === item;

                    return (
                      <button
                        key={item}
                        type="button"
                        onClick={() => setChannel(item)}
                        className={`rounded-full border px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] transition-all duration-300 ${
                          isActive
                            ? 'border-white/60 bg-gradient-to-br from-white to-[#F8F1F3] text-[#A06F73] shadow-[0_10px_24px_rgba(160,111,115,0.10)]'
                            : 'border-white/50 bg-white/45 text-stone-500 hover:bg-white/65 hover:text-stone-900'
                        }`}
                      >
                        {item}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-400">
                  Tần suất
                </label>
                <select
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value)}
                  className="w-full rounded-[22px] border border-white/50 bg-white/60 px-4 py-4 text-sm text-stone-900 outline-none backdrop-blur-sm transition focus:border-[#D7B6BA]"
                >
                  <option>Ngay khi chạm ngưỡng</option>
                  <option>Tóm tắt mỗi ngày</option>
                  <option>Tóm tắt mỗi tuần</option>
                </select>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-400">
                Ghi chú
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={4}
                placeholder="Ví dụ: ưu tiên official store hoặc free ship"
                className="w-full rounded-[22px] border border-white/50 bg-white/60 px-4 py-4 text-sm text-stone-900 outline-none backdrop-blur-sm transition focus:border-[#D7B6BA]"
              />
            </div>

            <div className="rounded-[24px] border border-[#E2D38A] bg-[linear-gradient(135deg,rgba(255,255,255,0.7),rgba(248,241,201,0.92))] p-4 shadow-[0_10px_28px_rgba(226,211,138,0.10)]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-600">
                Preview
              </p>

              <p className="mt-2 text-sm leading-7 text-stone-700">
                Bạn sẽ nhận cảnh báo khi giá xuống còn{' '}
                <span className="font-medium text-stone-900">
                  {parsedPrice > 0 ? formatPrice(parsedPrice) : '—'}
                </span>{' '}
                trên{' '}
                <span className="font-medium text-stone-900">
                  {platform === 'all' ? 'mọi sàn' : platform}
                </span>{' '}
                qua <span className="font-medium text-stone-900">{channel}</span>.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={onClose}
                className="rounded-full border border-white/50 bg-white/60 px-5 py-3 text-sm font-medium text-stone-700 backdrop-blur-sm transition hover:text-stone-900"
              >
                Hủy
              </button>

              <button
                type="submit"
                className="rounded-full bg-stone-900 px-6 py-3 text-sm font-medium text-white transition hover:opacity-90"
              >
                Tạo alert
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}