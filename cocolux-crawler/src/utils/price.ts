import { cleanText } from './text';

export function parsePrice(value: string | null | undefined): number | null {
  const cleaned = cleanText(value);
  if (!cleaned) return null;
  const digits = cleaned.replace(/[^\d]/g, '');
  if (!digits) return null;
  const parsed = Number.parseInt(digits, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

export function parseDiscountPct(value: string | null | undefined): number | null {
  const cleaned = cleanText(value);
  if (!cleaned) return null;
  const match = cleaned.match(/(-?\d{1,3})\s*%/);
  if (!match) return null;
  const parsed = Number.parseInt(match[1], 10);
  return Number.isFinite(parsed) ? Math.abs(parsed) : null;
}

export function calcDiscountPct(price: number | null, originalPrice: number | null): number | null {
  if (!price || !originalPrice || originalPrice <= 0 || price > originalPrice) return null;
  const pct = ((originalPrice - price) / originalPrice) * 100;
  return Math.round(pct * 100) / 100;
}
