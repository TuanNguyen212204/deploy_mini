import { runNormalizePipeline } from '../pipelines/normalize.pipeline';
import { logger } from '../core/logger';

async function main() {
  try {
    const records = await runNormalizePipeline();
    logger.info({ count: records.length }, 'normalize completed successfully');
  } catch (error) {
    logger.error(
      { err: error instanceof Error ? error.message : String(error) },
      'normalize failed'
    );
    process.exitCode = 1;
  }
}

void main();