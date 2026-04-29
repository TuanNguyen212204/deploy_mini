import dotenv from 'dotenv';

dotenv.config();

function getString(name: string, fallback?: string): string {
  const value = process.env[name]?.trim();
  if (value) return value;
  if (fallback !== undefined) return fallback;
  throw new Error(`Missing required environment variable: ${name}`);
}

function getBoolean(name: string, fallback: boolean): boolean {
  const value = process.env[name]?.trim().toLowerCase();
  if (!value) return fallback;
  if (['true', '1', 'yes', 'y'].includes(value)) return true;
  if (['false', '0', 'no', 'n'].includes(value)) return false;
  throw new Error(`Invalid boolean for ${name}: ${process.env[name]}`);
}

function getNumber(name: string, fallback: number): number {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Invalid number for ${name}: ${raw}`);
  }
  return parsed;
}

export const env = {
  baseUrl: getString('BASE_URL', 'https://hasaki.vn').replace(/\/$/, ''),
  headless: getBoolean('HEADLESS', true),
  requestTimeoutMs: getNumber('REQUEST_TIMEOUT_MS', 30_000),
  listingMaxPages: getNumber('LISTING_MAX_PAGES', 2),
  categoryLimit: getNumber('CATEGORY_LIMIT', 0),
  userAgent: getString(
    'USER_AGENT',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
  ),
  locale: getString('LOCALE', 'vi-VN'),
  viewportWidth: getNumber('VIEWPORT_WIDTH', 1440),
  viewportHeight: getNumber('VIEWPORT_HEIGHT', 900),
  blockAssetsOnListing: getBoolean('BLOCK_ASSETS_ON_LISTING', false),
  saveDebugHtmlOnError: getBoolean('SAVE_DEBUG_HTML_ON_ERROR', true)
} as const;
