import * as path from "node:path";
import { env } from '../config/env';
import {
  DETAIL_STATE_FILE,
  OUTPUT_DETAILS_FILE,
  OUTPUT_LISTINGS_FILE,
  RAW_DEBUG_HTML_DIR,
  RAW_DETAILS_DIR,
} from '../config/constants';
import { closeBrowserSession, createBrowserSession } from '../core/browser';
import { logger } from '../core/logger';
import { readJson, writeHtml, writeJson } from '../core/file-store';
import { extractProductDetail } from '../extractors/detail.extractor';
import { RawProductDetail } from '../types/detail.types';
import { RawListingPage } from '../types/listing.types';
import { fileSafeName } from '../utils/url';
import { SELECTORS } from '../config/selectors';

export async function runCrawlDetails(): Promise<RawProductDetail[]> {
  // 1. Đọc danh sách URL từ file listings
  const listingPages = await readJson<RawListingPage[]>(OUTPUT_LISTINGS_FILE, []);
  if (listingPages.length === 0) {
    throw new Error(`No listings found in ${OUTPUT_LISTINGS_FILE}. Run crawl-listings first.`);
  }

  const allUrls = Array.from(
    new Set(
      listingPages.flatMap((page) =>
        page.items.map((item) => item.productUrl).filter((url): url is string => Boolean(url))
      )
    )
  );

  if (allUrls.length === 0) {
    logger.warn('No product URLs found in listings.json');
    return [];
  }

  // 2. CƠ CHẾ RESUME: Đọc file details cũ để biết đã cào được bao nhiêu link
  const existingDetails = await readJson<RawProductDetail[]>(OUTPUT_DETAILS_FILE, []);
  const crawledUrls = new Set(existingDetails.map(d => d.url));
  
  // Chỉ lọc ra những URL chưa từng cào
  const urlsToCrawl = allUrls.filter(url => !crawledUrls.has(url));
  
  logger.info(`Tổng sản phẩm: ${allUrls.length} | Đã cào: ${crawledUrls.size} | Cần cào tiếp: ${urlsToCrawl.length}`);

  if (urlsToCrawl.length === 0) {
    logger.info('Tất cả sản phẩm đã được cào xong!');
    return existingDetails;
  }

  // Khởi tạo mảng kết quả từ dữ liệu cũ
  const details: RawProductDetail[] = [...existingDetails];
  const session = await createBrowserSession({ blockAssets: true });

  try {
    for (const url of urlsToCrawl) {
      logger.info({ url }, 'Crawling Cocolux detail');
      const page = await session.context.newPage();

      try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

        // Đợi thẻ tên sản phẩm (h1) xuất hiện để đảm bảo vượt qua Skeleton
        await page.waitForSelector('h1, .title-product', { timeout: 10000 }).catch(() => undefined);

        await page.evaluate(() => window.scrollTo(0, 600)).catch(() => undefined);
        await page.waitForTimeout(800);

        const detail = await extractProductDetail(page, env.baseUrl);
        details.push(detail);

        // Lưu file raw ngay lập tức
        const filename = `${fileSafeName(detail.barcode || detail.name || url)}.json`;
        await writeJson(path.join(RAW_DETAILS_DIR, filename), detail);

        // 👉 CƠ CHẾ LƯU CUỐN CHIẾU: Ghi đè file tổng ngay sau khi cào xong 1 sản phẩm
        await writeJson(OUTPUT_DETAILS_FILE, details);
        await writeJson(DETAIL_STATE_FILE, {
          lastRunAt: new Date().toISOString(),
          count: details.length,
          remaining: allUrls.length - details.length,
          success: true,
        });

      } catch (error) {
        logger.error({ err: error, url }, 'Failed to crawl detail page');

        if (env.saveDebugHtmlOnError) {
          const html = await page.content().catch(() => '');
          const filename = `${fileSafeName(url)}.html`;
          await writeHtml(path.join(RAW_DEBUG_HTML_DIR, filename), html);
        }
      } finally {
        await page.close();
      }
    }

    return details;
  } catch (error) {
    logger.error('Fatal error during detail crawling', error);
    throw error;
  } finally {
    await closeBrowserSession(session);
  }
}