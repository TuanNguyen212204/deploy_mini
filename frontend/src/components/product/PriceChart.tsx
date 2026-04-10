import React, { useMemo, useState } from 'react';
import type { PricePoint } from '../../types/product';

type PriceChartProps = {
  data: PricePoint[];
  title?: string;
};

const FONT_STACK = {
  serif: '"Times New Roman", Georgia, serif',
} as const;

const formatPrice = (price: number): string =>
  new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(price);

const formatDateLabel = (dateString: string): string => {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return dateString;

  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

export default function PriceChart({
  data,
  title = 'Biến động giá gần đây',
}: PriceChartProps) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const width = 720;
  const height = 220;
  const paddingX = 20;
  const paddingY = 22;

  const {
    min,
    max,
    current,
    chartPoints,
    polylinePoints,
    areaPoints,
  } = useMemo(() => {
    const prices = data.map((item) => item.price);
    const max = Math.max(...prices);
    const min = Math.min(...prices);
    const current = data[data.length - 1]?.price ?? 0;
    const range = max - min === 0 ? 1 : max - min;

    const chartPoints = data.map((item, index) => {
      const x =
        data.length === 1
          ? width / 2
          : paddingX + index * ((width - paddingX * 2) / (data.length - 1));

      const y =
        height -
        paddingY -
        ((item.price - min) / range) * (height - paddingY * 2);

      return {
        ...item,
        x,
        y,
      };
    });

    const polylinePoints = chartPoints
      .map((point) => `${point.x},${point.y}`)
      .join(' ');

    const areaPoints =
      chartPoints.length > 0
        ? [
            `${chartPoints[0].x},${height - paddingY}`,
            ...chartPoints.map((point) => `${point.x},${point.y}`),
            `${chartPoints[chartPoints.length - 1].x},${height - paddingY}`,
          ].join(' ')
        : '';

    return {
      min,
      max,
      current,
      chartPoints,
      polylinePoints,
      areaPoints,
    };
  }, [data]);

  const activePoint =
    hoverIndex !== null && chartPoints[hoverIndex] ? chartPoints[hoverIndex] : null;

  const handlePointerMove = (
    event: React.MouseEvent<SVGRectElement, MouseEvent>,
  ) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const relativeX = ((event.clientX - rect.left) / rect.width) * width;

    let closestIndex = 0;
    let closestDistance = Infinity;

    chartPoints.forEach((point, index) => {
      const distance = Math.abs(point.x - relativeX);
      if (distance < closestDistance) {
        closestDistance = distance;
        closestIndex = index;
      }
    });

    setHoverIndex(closestIndex);
  };

  const handlePointerLeave = () => {
    setHoverIndex(null);
  };

  return (
    <div className="rounded-[30px] border border-stone-200/80 bg-white p-6 shadow-[0_12px_30px_rgba(15,23,42,0.04)]">
      <div className="max-w-2xl">
        

        <h3
          className="mt-3 text-3xl tracking-normal text-stone-900"
          style={{
            fontFamily: FONT_STACK.serif,
            fontKerning: 'normal',
          }}
        >
          {title}
        </h3>

        <p className="mt-3 text-sm leading-7 text-stone-500">
          Di chuột vào đường giá để xem thời điểm và mức giá cụ thể.
        </p>
      </div>

      <div className="mt-6">
        <div className="relative">
          {activePoint && (
            <div
              className="pointer-events-none absolute z-10 rounded-[18px] border border-stone-200/80 bg-white/95 px-3 py-2 text-xs shadow-[0_10px_24px_rgba(15,23,42,0.08)] backdrop-blur-md"
              style={{
                left: `calc(${(activePoint.x / width) * 100}% - 56px)`,
                top: Math.max(0, (activePoint.y / height) * 100 - 22) + '%',
              }}
            >
              <p className="whitespace-nowrap font-medium text-stone-900">
                {formatPrice(activePoint.price)}
              </p>
              <p className="mt-1 whitespace-nowrap text-stone-500">
                {formatDateLabel(activePoint.date)}
              </p>
            </div>
          )}

          <svg viewBox={`0 0 ${width} ${height}`} className="h-56 w-full">
            <defs>
              <linearGradient id="price-chart-gradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#B7848C" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#B7848C" stopOpacity="0" />
              </linearGradient>
            </defs>

            {areaPoints && (
              <polygon
                points={areaPoints}
                fill="url(#price-chart-gradient)"
              />
            )}

            <polyline
              fill="none"
              stroke="#B7848C"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={polylinePoints}
            />

            {activePoint && (
              <>
                <line
                  x1={activePoint.x}
                  y1={paddingY}
                  x2={activePoint.x}
                  y2={height - paddingY}
                  stroke="#D9C6CB"
                  strokeWidth="1.5"
                  strokeDasharray="4 4"
                />
                <circle
                  cx={activePoint.x}
                  cy={activePoint.y}
                  r="14"
                  fill="rgba(183,132,140,0.15)"
                />
                <circle
                  cx={activePoint.x}
                  cy={activePoint.y}
                  r="5"
                  fill="#B7848C"
                />
              </>
            )}

            <rect
              x="0"
              y="0"
              width={width}
              height={height}
              fill="transparent"
              onMouseMove={handlePointerMove}
              onMouseLeave={handlePointerLeave}
            />
          </svg>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-sm text-stone-500">
        <span>
          Thấp nhất:{' '}
          <span className="font-medium text-stone-900">{formatPrice(min)}</span>
        </span>
        <span>
          Cao nhất:{' '}
          <span className="font-medium text-stone-900">{formatPrice(max)}</span>
        </span>
        <span>
          Hiện tại:{' '}
          <span className="font-medium text-[#8E6A72]">
            {formatPrice(current)}
          </span>
        </span>
      </div>

      <p className="mt-4 text-sm leading-7 text-stone-500">
        {current === min
          ? 'Giá hiện tại đang ở vùng thấp nhất gần đây, phù hợp để cân nhắc mua.'
          : 'Giá hiện tại đang ở một vùng đáng chú ý, phù hợp để so sánh thêm trước khi quyết định.'}
      </p>
    </div>
  );
}