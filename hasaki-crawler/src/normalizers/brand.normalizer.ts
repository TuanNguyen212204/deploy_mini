export function normalizeBrand(brand: string | null): string | null {
  if (!brand) return null;
  const cleaned = brand.trim();
  const ignoreList = ['đang cập nhật', 'no brand', 'khác', 'unknown'];
  if (ignoreList.includes(cleaned.toLowerCase())) return null;
  return cleaned;
}