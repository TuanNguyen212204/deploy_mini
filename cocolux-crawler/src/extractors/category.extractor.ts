import { Page } from 'playwright';
import { SELECTORS } from '../config/selectors';
import { RawCategory } from '../types/category.types';
import { cleanText } from '../utils/text';
import { toAbsoluteUrl } from '../utils/url';
import { toSlug } from '../utils/slug';

export async function extractCategories(page: Page, baseUrl: string): Promise<RawCategory[]> {
  const crawledAt = new Date().toISOString();
  const raw = await page.$$eval(
    SELECTORS.category.menuLinks,
    (links) => links.map((link) => ({
      href: (link as HTMLAnchorElement).getAttribute('href') || '',
      text: (link.textContent || '').trim(),
    })),
  );

  const dedup = new Map<string, RawCategory>();

  for (const item of raw) {
    const name = cleanText(item.text);
    const absoluteUrl = toAbsoluteUrl(baseUrl, item.href);
    if (!name || !absoluteUrl) continue;
    const parsed = new URL(absoluteUrl);
    if (!parsed.pathname.includes('/danh-muc/')) continue;

    const path = parsed.pathname;
    const slug = toSlug(name);
    if (!dedup.has(path)) {
      dedup.set(path, {
        name,
        url: absoluteUrl,
        path,
        slug,
        parentName: null,
        parentSlug: null,
        level: 1,
        crawledAt,
      });
    }
  }

  return Array.from(dedup.values()).sort((a, b) => a.name.localeCompare(b.name, 'vi'));
}
