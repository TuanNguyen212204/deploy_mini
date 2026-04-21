import { Page } from 'playwright';
import { PRIORITY_CATEGORY_KEYWORDS } from '../config/constants';
import { SELECTORS } from '../config/selectors';
import { RawCategory } from '../types/category.types';
import { cleanText, lowerCleanText } from '../utils/text';
import { toSlug } from '../utils/slug';
import { toAbsoluteUrl } from '../utils/url';

function getPriorityScore(name: string): number {
  const normalized = lowerCleanText(name) ?? '';
  if (!normalized) return 0;

  if (normalized.includes('băng vệ sinh')) return 100;
  if (normalized.includes('tẩy trang')) return 90;
  if (normalized.includes('body mist') || normalized.includes('xịt thơm toàn thân')) return 80;

  let score = 0;
  for (const keyword of PRIORITY_CATEGORY_KEYWORDS) {
    if (normalized.includes(keyword)) score += 10;
  }
  return score;
}

export async function extractCategories(page: Page, baseUrl: string): Promise<RawCategory[]> {
  const crawledAt = new Date().toISOString();
  const raw = await page.$$eval(SELECTORS.category.menuLinks, (links) =>
    links.map((link) => ({
      href: (link as HTMLAnchorElement).getAttribute('href') || '',
      text: (link.textContent || '').trim()
    }))
  );

  const dedup = new Map<string, RawCategory>();

  for (const item of raw) {
    const name = cleanText(item.text);
    const absoluteUrl = toAbsoluteUrl(baseUrl, item.href);
    if (!name || !absoluteUrl) continue;

    const parsed = new URL(absoluteUrl);
    if (!parsed.pathname.includes('/danh-muc/')) continue;

    const path = parsed.pathname;
    if (!dedup.has(path)) {
      dedup.set(path, {
        name,
        url: absoluteUrl,
        path,
        slug: toSlug(name),
        parentName: null,
        parentSlug: null,
        level: 1,
        priorityScore: getPriorityScore(name),
        crawledAt
      });
    }
  }

  return Array.from(dedup.values()).sort((a, b) => {
    if (b.priorityScore !== a.priorityScore) return b.priorityScore - a.priorityScore;
    return a.name.localeCompare(b.name, 'vi');
  });
}
