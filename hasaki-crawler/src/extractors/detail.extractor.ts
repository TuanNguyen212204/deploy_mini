import { Page } from 'playwright';
import { SELECTORS } from '../config/selectors';
import { RawProductDetail } from '../types/detail.types';
import { cleanText } from '../utils/text';
import { calcDiscountPct, parseDiscountPct, parsePrice } from '../utils/price';
import { normalizeUrl, toAbsoluteUrl } from '../utils/url';

// Hàm helper để parse dữ liệu từ thẻ JSON-LD (Dữ liệu sạch nhất của Hasaki)
async function getJsonLdData(page: Page) {
  return await page.evaluate(() => {
    const scripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));
    for (const script of scripts) {
      try {
        const data = JSON.parse(script.textContent || '{}');
        // Tìm đúng object Product
        if (data['@type'] === 'Product') return data;
        if (Array.isArray(data)) {
            const product = data.find(i => i['@type'] === 'Product');
            if (product) return product;
        }
      } catch (e) {}
    }
    return null;
  });
}

export async function extractProductDetail(page: Page, baseUrl: string): Promise<RawProductDetail> {
  const crawledAt = new Date().toISOString();

  // 1. Lấy dữ liệu từ JSON-LD trước (Ưu tiên số 1)
  const jsonLd = await getJsonLdData(page);

  // 2. Lấy dữ liệu thô từ giao diện (Ưu tiên số 2 - Fallback)
  const [nameRaw, brandRaw, priceNowRaw, priceOldRaw, discountRaw, bodyText] = await Promise.all([
    page.locator(SELECTORS.detail.name).first().textContent({ timeout: 1000 }).catch(() => null),
    page.locator(SELECTORS.detail.brand).first().textContent({ timeout: 1000 }).catch(() => null),
    page.locator(SELECTORS.detail.priceNow).first().textContent({ timeout: 1000 }).catch(() => null),
    page.locator(SELECTORS.detail.priceOld).first().textContent({ timeout: 1000 }).catch(() => null),
    page.locator(SELECTORS.detail.discount).first().textContent({ timeout: 1000 }).catch(() => null),
    page.locator('body').textContent({ timeout: 1000 }).catch(() => null),
  ]);

  // 3. Xử lý giá tiền (Ưu tiên lấy từ JSON-LD)
  const price = jsonLd?.offers?.price 
    ? parseFloat(jsonLd.offers.price) 
    : parsePrice(cleanText(priceNowRaw));
    
  const originalPrice = parsePrice(cleanText(priceOldRaw)) || price;
  const discountPct = parseDiscountPct(cleanText(discountRaw)) || calcDiscountPct(price, originalPrice);

  // 4. Xử lý hình ảnh (Lấy từ JSON-LD hoặc Gallery)
  let rawImages: string[] = [];
  if (jsonLd?.image) {
    rawImages = Array.isArray(jsonLd.image) ? jsonLd.image : [jsonLd.image];
  } else {
    rawImages = await page.locator(SELECTORS.detail.galleryImages).evaluateAll(els => 
      els.map(el => el.getAttribute('src') || el.getAttribute('data-src')).filter(Boolean) as string[]
    ).catch(() => []);
  }

  // Tìm đoạn này trong file extractors/detail.extractor.ts
const galleryImages = Array.from(
  new Set(
    rawImages
      .map(img => normalizeUrl(toAbsoluteUrl(baseUrl, img)))
      // Thêm dòng này để loại bỏ null và báo cho TS biết đây là mảng string
      .filter((img): img is string => img !== null) 
  )
);

  // 5. Các thông tin khác
  const name = cleanText(jsonLd?.name || nameRaw);
  const brandName = cleanText(jsonLd?.brand?.name || jsonLd?.brand || brandRaw);
  const barcode = jsonLd?.gtin13 || jsonLd?.sku || jsonLd?.mpn || null;

  const description = cleanText(jsonLd?.description || '');

  return {
    url: normalizeUrl(page.url()) || page.url(),
    name,
    brandName,
    barcode: barcode ? String(barcode) : null,
    statusText: bodyText?.includes('Hết hàng') ? 'Hết hàng' : 'Còn hàng',
    inStock: !bodyText?.includes('Hết hàng'),
    remainingQuantityText: null,
    branchesInStockText: null,
    price,
    originalPrice,
    flashSalePrice: price,
    discountPct,
    description: description || null,
    benefits: null, // Thường nằm trong description của Hasaki
    usage: null,
    ingredients: null,
    breadcrumb: await page.locator('.breadcrumb li').allTextContents().catch(() => []),
    galleryImages,
    crawledAt
  };
}