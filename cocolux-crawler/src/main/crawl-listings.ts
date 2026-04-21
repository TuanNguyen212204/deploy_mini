import { logger } from '../core/logger';
import { runCrawlListings } from '../pipelines/crawl-listings.pipeline';

async function main(): Promise<void> {
  try {
    const listingPages = await runCrawlListings();
    logger.info({ pages: listingPages.length }, 'crawl-listings completed');
  } catch (error) {
    logger.error({ err: error }, 'crawl-listings failed');
    process.exitCode = 1;
  }
}

void main();
