import path from 'node:path';
import { env } from '../config/env';
import {
  LISTING_STATE_FILE,
  OUTPUT_CATEGORIES_FILE,
  OUTPUT_LISTINGS_FILE,
  RAW_DEBUG_HTML_DIR,
  RAW_LISTINGS_DIR,
  SEEN_URLS_FILE,
} from '../config/constants';
import { closeBrowserSession, createBrowserSession } from '../core/browser';
import { logger } from '../core/logger';
import { readJson, writeHtml, writeJson } from '../core/file-store';
import { extractListingPage } from '../extractors/listing.extractor';
import { RawCategory } from '../types/category.types';
import { RawListingPage } from '../types/listing.types';
import { fileSafeName } from '../utils/url';
import { SELECTORS } from '../config/selectors';

export async function runCrawlListings(): Promise<RawListingPage[]> {
  const categories = await readJson<RawCategory[]>(OUTPUT_CATEGORIES_FILE, []);
  if (categories.length === 0) {
    throw new Error(`No categories found. Run discover-categories first.`);
  }

  const session = await createBrowserSession({ blockAssets: true });
  const results: RawListingPage[] = [];
  const seenUrls: Record<string, boolean> = {};

  try {
    for (const category of categories) {
      for (let pageNumber = 1; pageNumber <= env.listingMaxPages; pageNumber += 1) {
        const url = `${env.baseUrl}${category.path}?page=${pageNumber}`;
        logger.info({ url, page: pageNumber }, 'Crawling Cocolux listing');

        const page = await session.context.newPage();
        try {
          await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

          // 👉 CHIẾN THUẬT QUAN TRỌNG: Đợi thẻ h3 (tên sản phẩm) xuất hiện để biết Skeleton đã biến mất
          await page.waitForSelector(`${SELECTORS.listing.card} h3`, { 
            state: 'attached', 
            timeout: 10000 
          }).catch(() => logger.warn('Dữ liệu thật load chậm hoặc trang trống'));

          // 👉 CUỘN TRANG để kích hoạt Lazy Load cho ảnh và giá
          await page.evaluate(() => window.scrollBy(0, 600));
          await page.waitForTimeout(1000);

          const listingPage = await extractListingPage(page, {
            baseUrl: env.baseUrl,
            categoryPath: category.path,
            categoryName: category.name,
            pageNumber,
            currentUrl: url,
          });

          // Lưu kết quả...
          if (listingPage.items.length > 0) {
            results.push(listingPage);
            for (const item of listingPage.items) {
              if (item.productUrl) seenUrls[item.productUrl] = true;
            }
            
            const filename = `${fileSafeName(category.name)}-page-${pageNumber}.json`;
            await writeJson(path.join(RAW_LISTINGS_DIR, filename), listingPage);
            await writeJson(OUTPUT_LISTINGS_FILE, results);
            await writeJson(SEEN_URLS_FILE, seenUrls);
          } else {
            logger.warn({ url }, 'Trang này không có dữ liệu thực tế (chỉ có skeleton hoặc trống)');
            break; 
          }
        } catch (error) {
          logger.error({ err: error, url }, 'Lỗi khi cào trang listing');
        } finally {
          await page.close();
        }
      }
    }
    return results;
  } finally {
    await closeBrowserSession(session);
  }
}