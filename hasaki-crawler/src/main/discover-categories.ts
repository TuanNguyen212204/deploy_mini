import { logger } from '../core/logger';
import { runDiscoverCategories } from '../pipelines/discover-categories.pipeline';

async function main(): Promise<void> {
  try {
    const categories = await runDiscoverCategories();
    logger.info({ count: categories.length }, 'discover-categories completed');
  } catch (error) {
    logger.error({ err: error }, 'discover-categories failed');
    process.exitCode = 1;
  }
}

void main();
