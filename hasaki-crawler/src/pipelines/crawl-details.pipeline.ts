import path from 'node:path';
import { env } from '../config/env';
import {
  DETAIL_STATE_FILE,
  OUTPUT_DETAILS_FILE,
  OUTPUT_LISTINGS_FILE,
  RAW_DEBUG_HTML_DIR,
  RAW_DETAILS_DIR
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
  const listingPages = await readJson<RawListingPage[]>(OUTPUT_LISTINGS_FILE, []);
  if (listingPages.length === 0) {
    throw new Error(`No listings found in ${OUTPUT_LISTINGS_FILE}. Run crawl-listings first.`);
  }

  const urls = Array.from(
    new Set(
      listingPages.flatMap((page) => page.items.map((item) => item.productUrl).filter((url): url is string => Boolean(url)))
    )
  );

  // 1. ĐỌC LẠI FILE DETAILS CŨ: Giúp không bao giờ phải cào lại từ đầu nếu bị rớt mạng
  const details = await readJson<RawProductDetail[]>(OUTPUT_DETAILS_FILE, []);
  
  // 2. TẠO DANH SÁCH CÁC LINK ĐÃ CÀO
  const crawledUrls = new Set(details.map((d) => d.url));

  // 3. Mở Trình duyệt 1 lần duy nhất để chống giật lag
  const session = await createBrowserSession({ blockAssets: true });

  try {
    for (const url of urls) {
      
      // 4. KIỂM TRA BỎ QUA: Nếu link đã có trong file output, lập tức nhảy sang link tiếp theo
      if (crawledUrls.has(url)) {
        logger.info({ url }, 'Đã cào trước đó, bỏ qua (Skipping)');
        continue;
      }

      logger.info({ url }, 'Crawling product detail');
      
      // Mở Tab mới 
      const page = await session.context.newPage();

      // Chặn ảnh/font để load cực nhanh
      await page.route('**/*', async (route) => {
        const type = route.request().resourceType();
        if (['image', 'media', 'font', 'stylesheet'].includes(type)) {
          await route.abort().catch(() => {});
        } else {
          await route.continue().catch(() => {});
        }
      });
      
      try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: env.requestTimeoutMs });
        await page.locator(SELECTORS.detail.name).first().waitFor({ timeout: 10_000 }).catch(() => undefined);

        await page.waitForTimeout(3000);
        const detail = await extractProductDetail(page, env.baseUrl);
        
        // 👉 Đưa dữ liệu mới vào mảng và đánh dấu là đã cào
        details.push(detail);
        crawledUrls.add(url);

        // Lưu file raw của từng sản phẩm
        const filename = `${fileSafeName(detail.barcode || detail.name || url)}.json`;
        await writeJson(path.join(RAW_DETAILS_DIR, filename), detail);

        // 👉 QUAN TRỌNG NHẤT: Lưu file tổng output/details.json LIÊN TỤC tại đây
        await writeJson(OUTPUT_DETAILS_FILE, details);

      } catch (error) {
        logger.error({ err: error, url }, 'Failed to crawl detail page');

        if (env.saveDebugHtmlOnError) {
          const html = await page.content().catch(() => '<html><body>Unable to capture debug HTML</body></html>');
          const filename = `${fileSafeName(url)}.html`;
          await writeHtml(path.join(RAW_DEBUG_HTML_DIR, filename), html);
        }
      } finally {
        // Đóng Tab để dọn RAM
        await page.close().catch(() => undefined);
      }
    }

    // Ghi state khi hoàn tất toàn bộ
    await writeJson(DETAIL_STATE_FILE, {
      lastRunAt: new Date().toISOString(),
      count: details.length,
      success: true
    });

    return details;
  } catch (error) {
    await writeJson(DETAIL_STATE_FILE, {
      lastRunAt: new Date().toISOString(),
      success: false,
      error: error instanceof Error ? error.message : String(error)
    });
    throw error;
  } finally {
    // Đóng hẳn Chrome
    await closeBrowserSession(session);
  }
}