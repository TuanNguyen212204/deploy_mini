export interface NormalizedProduct {
  id: string;              // Unique hash dựa trên URL
  externalId: string | null; // Barcode hoặc SKU từ Hasaki
  name: string;
  brandName: string | null;
  categoryName: string;
  categoryPath: string;    // Chuỗi breadcrumb: "Chăm sóc da > Sữa rửa mặt"
  
  price: number;
  originalPrice: number;
  discountPct: number;
  
  // Thông tin định lượng
  volumeValue: number | null; // Số (vd: 50, 20)
  volumeUnit: string | null;  // Đơn vị (vd: ml, miếng)
  packSize: number;           // Combo bao nhiêu (mặc định 1)
  
  barcode: string | null;
  imageUrl: string | null;
  productUrl: string;
  
  inStock: boolean;
  crawledAt: string;
  updatedAt: string;
}