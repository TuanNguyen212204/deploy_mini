export type RawListingItem = {
  categoryPath: string;
  categoryName: string;
  page: number;
  productName: string | null;
  brandName: string | null;
  productUrl: string | null;
  imageUrl: string | null;
  price: number | null;
  originalPrice: number | null;
  discountPct: number | null;
  discountText: string | null;
  ratingText: string | null;
  salesText: string | null;
  crawledAt: string;
};

export type RawListingPage = {
  categoryPath: string;
  categoryName: string;
  page: number;
  url: string;
  items: RawListingItem[];
  crawledAt: string;
};
