import { runMatchPipeline } from '../pipelines/match.pipeline';
import { logger } from '../core/logger';

async function main() {
  try {
    const result = await runMatchPipeline();
    logger.info(
      {
        totalGroups: result.summary.totalGroups,
        totalMatchedRecords: result.summary.totalMatchedRecords,
      },
      'match completed successfully'
    );
  } catch (error) {
    logger.error(
      { err: error instanceof Error ? error.message : String(error) },
      'match failed'
    );
    process.exitCode = 1;
  }
}

void main();