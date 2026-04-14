import { Page } from 'playwright';
import { SELECTORS } from '../config/selectors';
import { RawListingItem, RawListingPage } from '../types/listing.types';
import { cleanText } from '../utils/text';
import { calcDiscountPct, parseDiscountPct, parsePrice } from '../utils/price';
import { normalizeUrl, toAbsoluteUrl } from '../utils/url';

type ListingContext = {
  baseUrl: string;
  categoryPath: string;
  categoryName: string;
  pageNumber: number;
  currentUrl: string;
};

// Hàm lọc bỏ ảnh khung/banner của Cocolux
function isBannerOrFrame(url: string | null): boolean {
  if (!url) return false;
  const lower = url.toLowerCase();
  return lower.includes('khung-vuong') || lower.includes('banner') || lower.includes('frame');
}

export async function extractListingPage(
  page: Page,
  context: ListingContext
): Promise<RawListingPage> {
  const crawledAt = new Date().toISOString();

  const rawItems = await page.locator(SELECTORS.listing.card).evaluateAll((cards) => {
    return cards
      .filter(card => !card.querySelector('.skeleton'))
      .map((card) => {
        const allLinks = Array.from(card.querySelectorAll('a'));
        const productLink = allLinks.find(a => a.getAttribute('href')?.includes('/san-pham/')) || card.querySelector('a');
        
        // Lấy toàn bộ ảnh và tìm cái nào KHÔNG phải khung/banner
        const imgs = Array.from(card.querySelectorAll('img'));
        const imgEl = imgs.find(img => {
          const src = img.getAttribute('data-src') || img.getAttribute('src') || '';
          return !src.includes('khung-vuong') && !src.includes('banner');
        }) || imgs[0];

        // Tách biệt Price Now và Price Old để tránh dính số (Cực kỳ quan trọng)
        const priceNowEl = card.querySelector('.price-now, .special-price, .now');
        const priceOldEl = card.querySelector('.price-old, .old, .price-origin');

        return {
          productName: card.querySelector('h3, .title-product')?.textContent?.trim() || null,
          brandName: card.querySelector('.brand, .trademark')?.textContent?.trim() || null,
          href: productLink?.getAttribute('href') || null,
          imageRaw: imgEl?.getAttribute('data-src') || imgEl?.getAttribute('src') || null,
          priceText: priceNowEl?.textContent?.trim() || null,
          oldPriceText: priceOldEl?.textContent?.trim() || null,
          // Chỉ lấy phần % hoặc số trong discount
          discountText: card.querySelector('.discount, .sale')?.textContent?.trim() || null,
          salesText: card.querySelector('.sold, .sale-info')?.textContent?.trim() || null,
          ratingText: card.querySelector('.rating-info, .stars')?.textContent?.trim() || null,
        };
      });
  });

  const items: RawListingItem[] = rawItems
    .map((raw): RawListingItem => {
      const productUrl = raw.href ? normalizeUrl(toAbsoluteUrl(context.baseUrl, raw.href)) : null;
      
      // Xử lý giá: Đảm bảo không bị dính chữ hay dính số của nhau
      const price = parsePrice(raw.priceText);
      const originalPrice = parsePrice(raw.oldPriceText);

      // Làm sạch discount và rating (loại bỏ phần "Đã bán" bị dính vào)
      const cleanDiscount = raw.discountText?.split(' ')[0] || null; // Lấy "10%" thay vì "10% Đã bán..."
      const cleanRating = raw.ratingText?.split(' ')[0] || null;    // Lấy "5" thay vì "5 Đã bán..."

      return {
        categoryPath: context.categoryPath,
        categoryName: context.categoryName,
        page: context.pageNumber,
        productName: cleanText(raw.productName),
        brandName: cleanText(raw.brandName),
        productUrl,
        imageUrl: isBannerOrFrame(raw.imageRaw) ? null : (raw.imageRaw ? normalizeUrl(toAbsoluteUrl(context.baseUrl, raw.imageRaw)) : null),
        price,
        originalPrice,
        discountPct: parseDiscountPct(cleanDiscount) || calcDiscountPct(price, originalPrice),
        discountText: cleanText(cleanDiscount),
        ratingText: cleanText(cleanRating),
        salesText: cleanText(raw.salesText),
        crawledAt,
      };
    })
    .filter((item): item is RawListingItem => item.productUrl !== null);

return {
    categoryPath: context.categoryPath,
    categoryName: context.categoryName,
    page: context.pageNumber, // Ép pageNumber của context vào thuộc tính page
    url: context.currentUrl,
    items,
    crawledAt,
  };
}