import { createHash } from 'node:crypto';

export function generateId(url: string): string {
  // Tạo MD5 hash từ URL để làm ID duy nhất không trùng lặp
  return createHash('md5').update(url).digest('hex');
}