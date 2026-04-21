import path from 'node:path';
import { env } from '../config/env';
import { CATEGORY_STATE_FILE, OUTPUT_CATEGORIES_FILE, RAW_CATEGORIES_DIR } from '../config/constants';
import { closeBrowserSession, createBrowserSession } from '../core/browser';
import { logger } from '../core/logger';
import { writeJson } from '../core/file-store';
import { extractCategories } from '../extractors/category.extractor';
import { fileSafeName } from '../utils/url';
import { RawCategory } from '../types/category.types';

export async function runDiscoverCategories(): Promise<RawCategory[]> {
  const session = await createBrowserSession();
  try {
    logger.info({ url: env.baseUrl }, 'Opening homepage to discover categories');
    await session.page.goto(env.baseUrl, { waitUntil: 'domcontentloaded' });
    await session.page.waitForLoadState('networkidle').catch(() => undefined);

    const categories = await extractCategories(session.page, env.baseUrl);
    logger.info({ count: categories.length }, 'Extracted categories');

    for (const category of categories) {
      const filename = `${fileSafeName(category.slug || category.name)}.json`;
      await writeJson(path.join(RAW_CATEGORIES_DIR, filename), category);
    }

    await writeJson(OUTPUT_CATEGORIES_FILE, categories);
    await writeJson(CATEGORY_STATE_FILE, {
      lastRunAt: new Date().toISOString(),
      count: categories.length,
      success: true
    });

    return categories;
  } catch (error) {
    await writeJson(CATEGORY_STATE_FILE, {
      lastRunAt: new Date().toISOString(),
      success: false,
      error: error instanceof Error ? error.message : String(error)
    });
    throw error;
  } finally {
    await closeBrowserSession(session);
  }
}
