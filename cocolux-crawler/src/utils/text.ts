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

export function findFirstMatchingText(haystack: string | null | undefined, patterns: RegExp[]): string | null {
  if (!haystack) return null;
  for (const pattern of patterns) {
    const match = haystack.match(pattern);
    if (!match) continue;
    const groups = match.slice(1).filter(Boolean);
    if (groups.length > 0) return cleanText(groups[groups.length - 1]);
    return cleanText(match[0]);
  }
  return null;
}
