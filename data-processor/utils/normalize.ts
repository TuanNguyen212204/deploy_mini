// utils/normalize.ts

export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .normalize('NFD') // Chuẩn hóa tiếng Việt
    .replace(/[\u0300-\u036f]/g, '') // Xóa dấu
    .replace(/[đĐ]/g, 'd')
    .replace(/([^0-9a-z-\s])/g, '') // Xóa ký tự đặc biệt
    .replace(/(\s+)/g, '-') // Thay khoảng trắng bằng -
    .replace(/-+/g, '-') // Xóa - thừa
    .replace(/^-+|-+$/g, ''); // Xóa - ở đầu và cuối
}

export function extractSizeTag(name: string): string | null {
  if (!name) return null;
  const lowerName = name.toLowerCase();
  
  // Bắt Size Quần
  const pantSize = lowerName.match(/\b(s-m|m-l|l-xl)\b/i);
  if (pantSize) return pantSize[1].toUpperCase();

  // Bắt Chiều dài (cm)
  const length = lowerName.match(/\b(\d+(\.\d+)?)\s*(cm)\b/i);
  // Bắt Số lượng (miếng/ml/g)
  const quantity = lowerName.match(/\b(\d+)\s*(ml|l|g|kg|miếng|pcs|cái|m)\b/i);

  let tag = "";
  if (length) tag += `${length[1]}cm_`;
  if (quantity) tag += `${quantity[1]}${quantity[2]}`;
  
  return tag || null;
}

export function cleanTextForAI(name: string): string {
  if (!name) return '';
  return name.toLowerCase().replace(/combo\s*\d+\s*/g, '').trim();
}