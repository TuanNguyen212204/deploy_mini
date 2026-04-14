import { logger } from '../core/logger';
import { runCrawlDetails } from '../pipelines/crawl-details.pipeline';

async function main(): Promise<void> {
  try {
    const details = await runCrawlDetails();
    logger.info({ count: details.length }, 'crawl-details completed');
  } catch (error) {
    logger.error({ err: error }, 'crawl-details failed');
    process.exitCode = 1;
  }
}

void main();
