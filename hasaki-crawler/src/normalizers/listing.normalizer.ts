import { RawListingItem } from '../types/listing.types';
import { generateId } from '../utils/hash';

export function normalizeListingItem(raw: RawListingItem) {
  return {
    id: generateId(raw.productUrl || ''),
    name: raw.productName,
    price: raw.price,
    imageUrl: raw.imageUrl,
    productUrl: raw.productUrl
  };
}