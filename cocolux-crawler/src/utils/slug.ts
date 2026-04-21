import { lowerCleanText } from './text';

export function toSlug(value: string | null | undefined): string | null {
  const cleaned = lowerCleanText(value);
  if (!cleaned) return null;
  return cleaned
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || null;
}
