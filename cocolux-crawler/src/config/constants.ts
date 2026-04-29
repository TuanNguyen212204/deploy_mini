import path from 'node:path';

export const PLATFORM_NAME = 'cocolux';
export const DEFAULT_RETRY_COUNT = 2;
export const STORAGE_DIR = path.resolve(process.cwd(), 'storage');
export const RAW_DIR = path.join(STORAGE_DIR, 'raw');
export const RAW_CATEGORIES_DIR = path.join(RAW_DIR, 'categories');
export const RAW_LISTINGS_DIR = path.join(RAW_DIR, 'listings');
export const RAW_DETAILS_DIR = path.join(RAW_DIR, 'details');
export const RAW_DEBUG_HTML_DIR = path.join(RAW_DIR, 'debug-html');
export const OUTPUT_DIR = path.join(STORAGE_DIR, 'output');
export const OUTPUT_CATEGORIES_FILE = path.join(OUTPUT_DIR, 'categories.json');
export const OUTPUT_LISTINGS_FILE = path.join(OUTPUT_DIR, 'listings.json');
export const OUTPUT_DETAILS_FILE = path.join(OUTPUT_DIR, 'details.json');
export const STATE_DIR = path.join(STORAGE_DIR, 'state');
export const CATEGORY_STATE_FILE = path.join(STATE_DIR, 'category-state.json');
export const LISTING_STATE_FILE = path.join(STATE_DIR, 'listing-state.json');
export const DETAIL_STATE_FILE = path.join(STATE_DIR, 'detail-state.json');
export const SEEN_URLS_FILE = path.join(STATE_DIR, 'seen-urls.json');
