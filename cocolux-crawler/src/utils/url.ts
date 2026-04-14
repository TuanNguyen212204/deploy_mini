export function toAbsoluteUrl(baseUrl: string, maybeRelativeUrl: string | null | undefined): string | null {
  if (!maybeRelativeUrl) return null;
  try {
    return new URL(maybeRelativeUrl, baseUrl).toString();
  } catch {
    return null;
  }
}

export function normalizeUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    parsed.hash = '';
    return parsed.toString();
  } catch {
    return null;
  }
}

export function fileSafeName(value: string): string {
  return value.replace(/[^a-zA-Z0-9-_]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
}
