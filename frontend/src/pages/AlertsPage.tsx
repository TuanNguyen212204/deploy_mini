import { useMemo, useState } from 'react';
import type { Alert } from '../types/alert';
import AppHeader from '../components/layout/AppHeader';

const FONT_STACK = {
  serif: '"Times New Roman", Georgia, serif',
  sans:
    'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
} as const;

export default function AlertsPage() {
  const [alerts] = useState<Alert[]>([]);

  const summaryText = useMemo(() => {
    const activeCount = alerts.filter((item) => item.status === 'active').length;
    const triggeredCount = alerts.filter(
      (item) => item.status === 'triggered',
    ).length;

    if (triggeredCount > 0) {
      return `${triggeredCount} món đã chạm giá đẹp · ${activeCount} món vẫn đang theo dõi`;
    }

    return `${alerts.length} món đang được theo dõi giá`;
  }, [alerts]);

  return (
    <div
      className="min-h-screen bg-[#FCF8F4] text-[#241B17]"
      style={{ fontFamily: FONT_STACK.sans }}
    >
      <div className="pointer-events-none fixed left-[-10%] top-[-12%] h-[40vw] w-[40vw] rounded-full bg-[#E9DED1] opacity-45 blur-[120px]" />
      <div className="pointer-events-none fixed bottom-[-10%] right-[-6%] h-[30vw] w-[30vw] rounded-full bg-[#EDE3D8] opacity-90 blur-[120px]" />

      <AppHeader currentPage="alerts" />

      <main className="mx-auto max-w-7xl px-6 pb-20 pt-36 lg:px-12">
        <section className="mb-10">
          <div className="max-w-3xl">
            <h1
              className="text-4xl leading-[1.08] text-[#241B17] md:text-5xl"
              style={{ fontFamily: FONT_STACK.serif }}
            >
              Những mức giá bạn
              <br className="hidden md:block" />
              đang chờ.
            </h1>

            <p className="mt-5 text-sm leading-7 text-[#74685F]">
              {summaryText}
            </p>
          </div>
        </section>

        <section className="space-y-5">
          <div className="rounded-[34px] border border-[#DDD2C6] bg-[#F8F4EE] p-8 text-sm leading-7 text-[#74685F] shadow-[0_10px_30px_rgba(33,24,19,0.06)]">
            <p className="text-[11px] uppercase tracking-[0.12em] text-[#8E6A72]">
              Chưa có dữ liệu
            </p>
            <p className="mt-3">
              Tính năng Alerts hiện chưa được nối với backend nên hệ thống không hiển thị dữ liệu giả.
            </p>
            <p className="mt-2 text-xs text-[#9A8A7A]">
              Khi có API alerts, trang này sẽ hiển thị dữ liệu thật theo tài khoản của bạn.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}