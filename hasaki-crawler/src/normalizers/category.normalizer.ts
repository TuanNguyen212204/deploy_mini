export function normalizeCategory(breadcrumb: string[]) {
  // Lấy cấp cuối cùng làm tên Category, các cấp trước đó nối lại thành Path
  const cleanBreadcrumb = breadcrumb.filter(b => b !== '/');
  return {
    categoryName: cleanBreadcrumb[cleanBreadcrumb.length - 1] || 'Sản phẩm khác',
    categoryPath: cleanBreadcrumb.join(' > ') || 'Tất cả'
  };
}