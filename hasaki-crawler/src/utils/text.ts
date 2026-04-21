export function cleanText(value: string | null | undefined): string | null {
  if (!value) return null;
  const cleaned = value
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned || null;
}

export function lowerCleanText(value: string | null | undefined): string | null {
  const cleaned = cleanText(value);
  return cleaned ? cleaned.toLowerCase() : null;
}
