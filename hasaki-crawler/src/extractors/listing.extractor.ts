import { Page } from 'playwright';
import { SELECTORS } from '../config/selectors';
import { RawListingItem, RawListingPage } from '../types/listing.types';
import { calcDiscountPct, parseDiscountPct, parsePrice } from '../utils/price';

type ListingContext = {
  baseUrl: string;
  categoryPath: string;
  categoryName: string;
  pageNumber: number;
  currentUrl: string;
};

export async function extractListingPage(page: Page, context: ListingContext): Promise<RawListingPage> {
  const crawledAt = new Date().toISOString();

  // Bơm JS chạy trực tiếp dưới Local Browser bằng $$eval
  const rawItems = await page.$$eval(
    SELECTORS.listing.productLinks,
    (links, baseUrl) => {
      const results = [];
      const seenUrls = new Set();

      for (const link of links) {
        const href = link.getAttribute('href');
        if (!href || !href.includes('/san-pham/')) continue;

        // Chuẩn hóa URL để lọc trùng lặp
        const urlObj = new URL(href, baseUrl);
        urlObj.hash = '';
        urlObj.search = '';
        const productUrl = urlObj.toString();

        if (seenUrls.has(productUrl)) continue;

        // 1. Dò tìm THẺ BAO NGOÀI (Product Card Container)
        let card = link.closest('.ProductGridItem__itemOuter, .item_sp_hasaki, .item-product, [class*="product-item"], [class*="productItem"]');
        
        if (!card) {
          card = link.closest('div[class*="item"], div[class*="product"]');
        }
        if (!card) card = link;

        // 2. LẤY DỮ LIỆU
        const nameEl = card.querySelector('.vn_names, .product-name, [class*="name"], .info_sp, h3, h4');
        let productName = nameEl ? (nameEl as HTMLElement).innerText.trim() : (link as HTMLElement).innerText.trim();
        productName = productName.replace(/\n/g, ' ').replace(/\s{2,}/g, ' ');

        const imgEl = card.querySelector('img');
        let imageUrl = imgEl ? (imgEl.getAttribute('data-src') || imgEl.getAttribute('data-lazy-src') || imgEl.getAttribute('src')) : null;
        
        if (imageUrl) {
          imageUrl = new URL(imageUrl, baseUrl).toString();
          
          // Đã gỡ bỏ hàm con looksLikeBanner và viết inline thẳng vào đây để tránh lỗi tsx inject code
          const lowerImageUrl = imageUrl.toLowerCase();
          if (lowerImageUrl.includes('banner') || lowerImageUrl.includes('/ads/') || lowerImageUrl.includes('icon')) {
            imageUrl = null;
          }
        }

        const priceNowEl = card.querySelector('.txt_price, .price, .item-price, [class*="price"]');
        const priceText = priceNowEl ? (priceNowEl as HTMLElement).innerText.trim() : '';

        const priceOldEl = card.querySelector('.txt_price_market, .price_old, .old-price, [class*="old"], [class*="market"]');
        const oldPriceText = priceOldEl ? (priceOldEl as HTMLElement).innerText.trim() : '';

        const discountEl = card.querySelector('.txt_discount, .discount_percent, [class*="discount"]');
        const discountText = discountEl ? (discountEl as HTMLElement).innerText.trim() : '';

        const brandEl = card.querySelector('.txt_nhan_hieu, .item-brand, [class*="brand"]');
        const brandName = brandEl ? (brandEl as HTMLElement).innerText.trim() : '';

        const salesEl = card.querySelector('.txt_quantity_sold, [class*="sold"]');
        const salesText = salesEl ? (salesEl as HTMLElement).innerText.trim() : '';

        const ratingEl = card.querySelector('.txt_rate, [class*="rating"]');
        const ratingText = ratingEl ? (ratingEl as HTMLElement).innerText.trim() : '';

        // Nếu mọi thông tin quan trọng đều trống, bỏ qua
        if (!productName && !priceText && !brandName) continue;

        seenUrls.add(productUrl);

        results.push({
          productName,
          brandName,
          productUrl,
          imageUrl,
          priceText,
          oldPriceText,
          discountText,
          ratingText,
          salesText
        });
      }
      return results;
    },
    context.baseUrl
  );

  // 3. Ép kiểu và tính toán logic số học lại tại môi trường Node.js
  const items: RawListingItem[] = rawItems.map((raw) => {
    const price = parsePrice(raw.priceText);
    const originalPrice = parsePrice(raw.oldPriceText);
    const discountPct = parseDiscountPct(raw.discountText) ?? calcDiscountPct(price, originalPrice);

    return {
      categoryPath: context.categoryPath,
      categoryName: context.categoryName,
      page: context.pageNumber,
      productName: raw.productName,
      brandName: raw.brandName || null,
      productUrl: raw.productUrl,
      imageUrl: raw.imageUrl,
      price,
      originalPrice,
      discountPct,
      discountText: raw.discountText || null,
      ratingText: raw.ratingText || null,
      salesText: raw.salesText || null,
      crawledAt
    };
  });

  return {
    categoryPath: context.categoryPath,
    categoryName: context.categoryName,
    page: context.pageNumber,
    url: context.currentUrl,
    items,
    crawledAt
  };
}