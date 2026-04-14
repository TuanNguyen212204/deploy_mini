import { RawProductDetail } from '../types/detail.types';
import { NormalizedProduct } from '../types/normalized.types';
import { normalizeProduct } from '../normalizers/product.normalizer';
import { NormalizedProductSchema } from '../schemas/normalized.schema';
import { logger } from '../core/logger';

export class NormalizeService {
  static process(rawItems: RawProductDetail[]): NormalizedProduct[] {
    const result: NormalizedProduct[] = [];

    for (const raw of rawItems) {
      try {
        const normalized = normalizeProduct(raw);
        // Kiểm tra dữ liệu qua Zod để đảm bảo không có lỗi null/undefined sai chỗ
        NormalizedProductSchema.parse(normalized);
        result.push(normalized);
      } catch (err) {
        logger.error({ url: raw.url, err }, 'Lỗi chuẩn hóa sản phẩm');
      }
    }

    return result;
  }
}