import { RawProductDetail } from '../types/detail.types';
import { NormalizedProduct } from '../types/normalized.types';
import { generateId } from '../utils/hash';
import { parseVolume, parsePackSize } from '../utils/volume';
import { normalizePrices } from './price.normalizer';
import { normalizeBrand } from './brand.normalizer';
import { normalizeCategory } from './category.normalizer';

export function normalizeProduct(raw: RawProductDetail): NormalizedProduct {
  const { price, originalPrice, discountPct } = normalizePrices(raw.price, raw.originalPrice);
  const { categoryName, categoryPath } = normalizeCategory(raw.breadcrumb);
  const volume = parseVolume(raw.name || '');
  
  return {
    id: generateId(raw.url),
    externalId: raw.barcode || null,
    name: raw.name?.trim() || 'Không có tên',
    brandName: normalizeBrand(raw.brandName),
    categoryName,
    categoryPath,
    price,
    originalPrice,
    discountPct,
    volumeValue: volume.value,
    volumeUnit: volume.unit,
    packSize: parsePackSize(raw.name || ''),
    barcode: raw.barcode,
    imageUrl: raw.galleryImages[0] || null,
    productUrl: raw.url,
    inStock: raw.inStock ?? true,
    crawledAt: raw.crawledAt,
    updatedAt: new Date().toISOString()
  };
}