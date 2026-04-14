import path from 'node:path';
import { env } from '../config/env';
import {
  LISTING_STATE_FILE,
  OUTPUT_CATEGORIES_FILE,
  OUTPUT_LISTINGS_FILE,
  RAW_DEBUG_HTML_DIR,
  RAW_LISTINGS_DIR,
  SEEN_URLS_FILE
} from '../config/constants';
import { closeBrowserSession, createBrowserSession } from '../core/browser';
import { logger } from '../core/logger';
import { readJson, writeHtml, writeJson } from '../core/file-store';
import { extractListingPage } from '../extractors/listing.extractor';
import { RawCategory } from '../types/category.types';
import { RawListingPage } from '../types/listing.types';
import { fileSafeName } from '../utils/url';
import { SELECTORS } from '../config/selectors';

function buildListingUrl(baseUrl: string, categoryPath: string, pageNumber: number): string {
  const url = new URL(categoryPath, baseUrl);
  if (pageNumber > 1) url.searchParams.set('p', String(pageNumber));
  return url.toString();
}

export async function runCrawlListings(): Promise<RawListingPage[]> {
  const categories = await readJson<RawCategory[]>(OUTPUT_CATEGORIES_FILE, []);
  if (categories.length === 0) {
    throw new Error(`No categories found in ${OUTPUT_CATEGORIES_FILE}. Run discover-categories first.`);
  }

  const prioritized = [...categories].sort((a, b) => b.priorityScore - a.priorityScore || a.name.localeCompare(b.name, 'vi'));
  const targetCategories = env.categoryLimit > 0 ? prioritized.slice(0, env.categoryLimit) : prioritized;

  const session = await createBrowserSession({ blockAssets: env.blockAssetsOnListing });
  const results = await readJson<RawListingPage[]>(OUTPUT_LISTINGS_FILE, []);
  const seenUrls = await readJson<Record<string, boolean>>(SEEN_URLS_FILE, {});

  try {
    for (const category of targetCategories) {
      for (let pageNumber = 1; pageNumber <= env.listingMaxPages; pageNumber += 1) {
        const url = buildListingUrl(env.baseUrl, category.path, pageNumber);
        logger.info({ url, pageNumber, category: category.name, priorityScore: category.priorityScore }, 'Crawling listing page');

        try {
          await session.page.goto(url, { waitUntil: 'domcontentloaded', timeout: env.requestTimeoutMs });
          await session.page.locator(SELECTORS.listing.pageBody).first().waitFor({ timeout: 10_000 });

          await session.page.waitForFunction(
            (selector) => document.querySelectorAll(selector).length > 0,
            SELECTORS.listing.productLinks,
            { timeout: 15_000 }
          ).catch(() => undefined);

          await session.page.waitForTimeout(2000);

          await session.page.evaluate(async () => {
            for (let i = 0; i < 4; i += 1) {
              window.scrollBy(0, window.innerHeight);
              await new Promise((resolve) => setTimeout(resolve, 700));
            }
          }).catch(() => undefined);

          const productLinkCount = await session.page.locator(SELECTORS.listing.productLinks).count();
          const cardCount = await session.page.locator(SELECTORS.listing.card).count();

          logger.info({ url, pageNumber, category: category.name, productLinkCount, cardCount }, 'Detected listing DOM');

          const listingPage = await extractListingPage(session.page, {
            baseUrl: env.baseUrl,
            categoryPath: category.path,
            categoryName: category.name,
            pageNumber,
            currentUrl: url
          });

          logger.info({ url, pageNumber, category: category.name, itemCount: listingPage.items.length }, 'Extracted listing page');

          const filename = `${fileSafeName(category.slug || category.name)}-page-${pageNumber}.json`;
          await writeJson(path.join(RAW_LISTINGS_DIR, filename), listingPage);

          for (const item of listingPage.items) {
            if (item.productUrl) seenUrls[item.productUrl] = true;
          }

          const existingIndex = results.findIndex(
            (entry) => entry.categoryPath === listingPage.categoryPath && entry.page === listingPage.page
          );
          if (existingIndex >= 0) results[existingIndex] = listingPage;
          else results.push(listingPage);

          await writeJson(OUTPUT_LISTINGS_FILE, results);
          await writeJson(SEEN_URLS_FILE, seenUrls);
          await writeJson(LISTING_STATE_FILE, {
            lastRunAt: new Date().toISOString(),
            currentCategory: category.name,
            currentCategoryPath: category.path,
            currentPage: pageNumber,
            pageCount: results.length,
            uniqueProductUrls: Object.keys(seenUrls).length,
            success: true,
            inProgress: true
          });

          if (listingPage.items.length === 0) {
            if (env.saveDebugHtmlOnError) {
              const html = await session.page.content().catch(
                () => '<html><body>Unable to capture empty-result HTML</body></html>'
              );
              const debugFilename = `${fileSafeName(category.slug || category.name)}-page-${pageNumber}-empty.html`;
              await writeHtml(path.join(RAW_DEBUG_HTML_DIR, debugFilename), html);
            }

            logger.warn({ url, productLinkCount, cardCount }, 'No items found on listing page, stopping pagination for this category');
            break;
          }
        } catch (error) {
          logger.error({ err: error, url, category: category.name, pageNumber }, 'Failed to crawl listing page');

          if (env.saveDebugHtmlOnError) {
            const html = await session.page.content().catch(() => '<html><body>Unable to capture debug HTML</body></html>');
            const filename = `${fileSafeName(category.slug || category.name)}-page-${pageNumber}.html`;
            await writeHtml(path.join(RAW_DEBUG_HTML_DIR, filename), html);
          }

          await writeJson(LISTING_STATE_FILE, {
            lastRunAt: new Date().toISOString(),
            currentCategory: category.name,
            currentCategoryPath: category.path,
            currentPage: pageNumber,
            pageCount: results.length,
            uniqueProductUrls: Object.keys(seenUrls).length,
            success: false,
            inProgress: true,
            error: error instanceof Error ? error.message : String(error)
          });
        }
      }
    }

    await writeJson(OUTPUT_LISTINGS_FILE, results);
    await writeJson(SEEN_URLS_FILE, seenUrls);
    await writeJson(LISTING_STATE_FILE, {
      lastRunAt: new Date().toISOString(),
      pageCount: results.length,
      uniqueProductUrls: Object.keys(seenUrls).length,
      success: true,
      inProgress: false
    });

    return results;
  } catch (error) {
    await writeJson(LISTING_STATE_FILE, {
      lastRunAt: new Date().toISOString(),
      success: false,
      inProgress: false,
      error: error instanceof Error ? error.message : String(error)
    });
    throw error;
  } finally {
    await closeBrowserSession(session);
  }
}