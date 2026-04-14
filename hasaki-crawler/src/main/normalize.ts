import { runNormalizePipeline } from '../pipelines/normalize.pipeline';
import { logger } from '../core/logger';

async function main() {
  try {
    await runNormalizePipeline();
    process.exit(0);
  } catch (error) {
    logger.error(error, 'Normalize main failed');
    process.exit(1);
  }
}

main();