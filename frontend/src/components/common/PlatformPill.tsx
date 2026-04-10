export type PlatformName = 'Shopee' | 'Lazada' | 'Tiki' | 'Sendo';

type PlatformPillProps = {
  platform: PlatformName;
  compact?: boolean;
};

const PLATFORM_META: Record<
  PlatformName,
  { label: string; bg: string; text: string; dot: string; border: string }
> = {
  Shopee: {
    label: 'Shopee',
    bg: 'bg-[#F8F1EC]',
    text: 'text-[#A56A4F]',
    dot: 'bg-[#C98563]',
    border: 'border-[#EAD8CF]',
  },
  Lazada: {
    label: 'Lazada',
    bg: 'bg-[#F4F0F8]',
    text: 'text-[#7C6A96]',
    dot: 'bg-[#9A87B6]',
    border: 'border-[#E3DAEC]',
  },
  Tiki: {
    label: 'Tiki',
    bg: 'bg-[#EEF4F7]',
    text: 'text-[#5F7E8E]',
    dot: 'bg-[#7F9EAE]',
    border: 'border-[#DCE7ED]',
  },
  Sendo: {
    label: 'Sendo',
    bg: 'bg-[#F8EFF3]',
    text: 'text-[#9A6C7D]',
    dot: 'bg-[#B78495]',
    border: 'border-[#EADBE2]',
  },
};

export default function PlatformPill({
  platform,
  compact = false,
}: PlatformPillProps) {
  const meta = PLATFORM_META[platform];

  return (
    <span
      className={`inline-flex items-center rounded-full border ${meta.border} ${meta.bg} ${meta.text} ${
        compact ? 'gap-1.5 px-2.5 py-1 text-[10px]' : 'gap-2 px-3 py-1.5 text-xs'
      } font-medium`}
    >
      <span
        className={`rounded-full ${meta.dot} ${
          compact ? 'h-1.5 w-1.5' : 'h-2 w-2'
        }`}
      />
      {meta.label}
    </span>
  );
}