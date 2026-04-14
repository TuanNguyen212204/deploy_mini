import { z } from 'zod';

export const NormalizedProductSchema = z.object({
  id: z.string(),
  externalId: z.string().nullable(),
  name: z.string(),
  brandName: z.string().nullable(),
  categoryName: z.string(),
  categoryPath: z.string(),
  price: z.number().nonnegative(),
  originalPrice: z.number().nonnegative(),
  discountPct: z.number().min(0).max(100),
  volumeValue: z.number().nullable(),
  volumeUnit: z.string().nullable(),
  packSize: z.number().int().positive(),
  barcode: z.string().nullable(),
  imageUrl: z.string().url().nullable(),
  productUrl: z.string().url(),
  inStock: z.boolean(),
  crawledAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});