import React from 'react';

type BadgeVariant =
  | 'brand'
  | 'success'
  | 'warning'
  | 'danger'
  | 'neutral'
  | 'soft';

type BadgeProps = {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
};

const VARIANT_STYLES: Record<BadgeVariant, string> = {
  brand:
    'border border-[#E7D8DB] bg-[#F8F1F3] text-[#8E6A72]',
  success:
    'border border-[#EAE7DF] bg-[#F8F6F1] text-[#6F6A62]',
  warning:
    'border border-[#EFE5D7] bg-[#FBF6EE] text-[#8A735C]',
  danger:
    'border border-[#F1DFE2] bg-[#FCF4F5] text-[#9A6C73]',
  neutral:
    'border border-stone-200 bg-white text-stone-600',
  soft:
    'border border-white/70 bg-white/80 text-stone-600 backdrop-blur-md',
};

export default function Badge({
  children,
  variant = 'neutral',
  className = '',
}: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-[10px] font-medium uppercase tracking-[0.14em] ${VARIANT_STYLES[variant]} ${className}`}
    >
      {children}
    </span>
  );
}