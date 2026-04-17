export function normalizePrices(price: number | null, original: number | null) {
  const p = price || 0;
  const o = original || p; // Nếu không có giá gốc, coi như không giảm giá
  const pct = o > 0 ? Math.round(((o - p) / o) * 100) : 0;
  
  return {
    price: p,
    originalPrice: o,
    discountPct: pct >= 0 && pct <= 100 ? pct : 0
  };
}