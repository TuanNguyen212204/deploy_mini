import { OUTPUT_DETAILS_FILE, OUTPUT_DIR } from '../config/constants';
import { readJson, writeJson } from '../core/file-store';
import { RawProductDetail } from '../types/detail.types';
import { NormalizeService } from '../services/normalize.service';
import path from 'node:path';
import { logger } from '../core/logger';

export async function runNormalizePipeline() {
  logger.info('Bắt đầu Pipeline Chuẩn hóa...');

  const rawDetails = await readJson<RawProductDetail[]>(OUTPUT_DETAILS_FILE, []);
  if (!rawDetails.length) {
    throw new Error('Không tìm thấy file details.json thô để xử lý.');
  }

  const normalizedData = NormalizeService.process(rawDetails);

  const outputPath = path.join(OUTPUT_DIR, 'normalized-products.json');
  await writeJson(outputPath, normalizedData);

  logger.info(`Hoàn tất! Đã làm sạch ${normalizedData.length} sản phẩm. File lưu tại: ${outputPath}`);
}