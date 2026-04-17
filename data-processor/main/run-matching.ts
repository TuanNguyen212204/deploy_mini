// File: src/main/run-matching.ts
import { runAIClustering } from '../pipelines/match.pipeline';

runAIClustering().catch(err => {
  console.error("❌ Lỗi nghiêm trọng khi chạy AI:", err);
  process.exit(1);
});