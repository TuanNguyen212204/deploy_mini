import { Page } from 'playwright';
import { SELECTORS } from '../config/selectors';
import { RawProductDetail } from '../types/detail.types';
import { cleanText } from '../utils/text';
import { calcDiscountPct, parseDiscountPct, parsePrice } from '../utils/price';
import { normalizeUrl, toAbsoluteUrl } from '../utils/url';

// --- CÁC HÀM HELPER BỔ TRỢ ĐÃ ĐƯỢC NÂNG CẤP ---

function firstCapturedGroup(input: string | null, patterns: RegExp[]): string | null {
  if (!input) return null;
  for (const pattern of patterns) {
    const match = input.match(pattern);
    if (!match) continue;
    return cleanText(match[1] || match[0]);
  }
  return null;
}

function stripNoise(text: string | null): string | null {
  if (!text) return null;
  let cleaned = text;
  const cutMarkers = ['Gợi ý sản phẩm', 'Sản phẩm cùng danh mục', 'Đánh giá', 'Bình luận', 'COCOLUX là hệ thống'];
  for (const marker of cutMarkers) {
    const index = cleaned.indexOf(marker);
    if (index > 0) cleaned = cleaned.slice(0, index);
  }
  return cleanText(cleaned.replace(/\s{2,}/g, ' '));
}

// Lấy con số đầu tiên tìm thấy để tránh dính nhiều giá với nhau (Fix lỗi 43000430010)
function extractFirstPrice(text: string | null): number | null {
  if (!text) return null;
  const match = text.match(/(\d{1,3}(?:[.,]\d{3})+|\d{4,})/);
  if (match) {
    return parseInt(match[1].replace(/[.,]/g, ''), 10);
  }
  return null;
}

// Bóc tách section khắt khe hơn: Phải là đầu dòng hoặc có dấu hai chấm (Fix lỗi cắt nhầm câu)
function extractSection(block: string | null, label: string, nextLabels: string[]): string | null {
  if (!block) return null;
  const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const escapedNext = nextLabels.map((item) => item.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  
  // Yêu cầu Label phải nằm sau dấu xuống dòng hoặc có dấu : phía sau để đảm bảo nó là Tiêu đề
  const regex = new RegExp(`(?:^|\\n)\\s*\\**${escapedLabel}\\**\\s*(?::|-)?\\s*([\\s\\S]*?)(?=(?:^|\\n)\\s*\\**(?:${escapedNext})\\**\\s*(?::|-)?|$)`, 'i');
  
  const match = block.match(regex);
  if (!match?.[1]) return null;
  return stripNoise(match[1]);
}

export async function extractProductDetail(page: Page, baseUrl: string): Promise<RawProductDetail> {
  const crawledAt = new Date().toISOString();
  
  const jsonLd = await page.evaluate(() => {
    const scripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));
    for (const s of scripts) {
      try {
        const data = JSON.parse(s.textContent || '{}');
        if (data['@type'] === 'Product') return data;
        if (Array.isArray(data)) return data.find((i: any) => i['@type'] === 'Product');
      } catch (e) {}
    }
    return null;
  });

  const fastOptions = { timeout: 1000 };
  const [nameRaw, priceNowRaw, priceOldRaw, discountRaw, bodyTextRaw, descriptionRaw] = await Promise.all([
    page.locator(SELECTORS.detail.name).first().textContent(fastOptions).catch(() => null),
    page.locator(SELECTORS.detail.priceNow).first().textContent(fastOptions).catch(() => null),
    page.locator(SELECTORS.detail.priceOld).first().textContent(fastOptions).catch(() => null),
    page.locator(SELECTORS.detail.discount).first().textContent(fastOptions).catch(() => null),
    page.locator('body').first().innerText(fastOptions).catch(() => ''), // innerText giữ lại dấu \n
    page.locator(SELECTORS.detail.description).first().innerText(fastOptions).catch(() => ''),
  ]);

  const bodyText = bodyTextRaw || '';
  const descriptionBlock = descriptionRaw || '';

  let brandName = cleanText(jsonLd?.brand?.name || jsonLd?.brand || '');
  if (!brandName) {
    brandName = firstCapturedGroup(bodyText, [
      /(?:^|\n)\s*Thương hiệu\s*:?\s*([A-Za-z0-9\s&-]+)(?=\n|\||Mã|Xuất xứ)/i,
    ]) || '';
  }

  // --- XỬ LÝ GIÁ AN TOÀN ---
  const price = jsonLd?.offers?.price ? parseFloat(jsonLd.offers.price) : extractFirstPrice(priceNowRaw);
  let originalPrice = extractFirstPrice(priceOldRaw);
  
  if (!originalPrice && price && bodyText) {
// Dùng Array.from thay vì spread syntax [...] để TypeScript dễ nhận diện kiểu hơn
const allPricesMatches: RegExpMatchArray[] = Array.from(bodyText.matchAll(/(\d{1,3}(?:\.\d{3})+)\s*(?:đ|₫|vnđ)/gi));    
    for (const match of allPricesMatches) {
      const foundPrice = extractFirstPrice(match[1]);
      if (foundPrice && price && foundPrice > price) {
        originalPrice = foundPrice;
        break;
      }
    }
  }
  if (!originalPrice || (price && originalPrice < price)) originalPrice = price;

  const barcode = jsonLd?.gtin13 || jsonLd?.sku || firstCapturedGroup(bodyText, [
    /Mã sản phẩm\s*:?\s*([A-Za-z0-9-]{6,})/i,
    /SKU\s*:?\s*([A-Za-z0-9-]{6,})/i,
    /\b(\d{13})\b/ 
  ]);

  // --- BÓC TÁCH MÔ TẢ AN TOÀN ---
  const description = extractSection(descriptionBlock, 'Mô tả sản phẩm', ['Công dụng', 'Thành phần', 'Cách dùng', 'Hướng dẫn']) || cleanText(descriptionBlock);
  const benefits = extractSection(descriptionBlock, 'Công dụng', ['Thành phần', 'Cách dùng', 'Hướng dẫn', 'Lưu ý']);
  const usage = extractSection(descriptionBlock, 'Cách dùng', ['Thành phần', 'Lưu ý']) || extractSection(descriptionBlock, 'Hướng dẫn', ['Thành phần', 'Lưu ý']);
  const ingredients = extractSection(descriptionBlock, 'Thành phần', ['Hướng dẫn', 'Cách dùng', 'Đánh giá', 'Lưu ý']);

  let galleryImages: string[] = [];
  if (jsonLd?.image) {
    const imagesArray = Array.isArray(jsonLd.image) ? jsonLd.image : [jsonLd.image];
    galleryImages = imagesArray
      .map((i: any) => normalizeUrl(toAbsoluteUrl(baseUrl, String(i))))
      .filter((i: string | null): i is string => Boolean(i) && !i?.includes('khung-vuong'));
  }

  return {
    url: normalizeUrl(page.url()) || page.url(),
    name: cleanText(jsonLd?.name || nameRaw),
    brandName: brandName || null,
    barcode: barcode ? String(barcode) : null,
    statusText: bodyText.includes('Hết hàng') ? 'Hết hàng' : 'Còn hàng',
    inStock: !bodyText.includes('Hết hàng'),
    remainingQuantityText: firstCapturedGroup(bodyText, [/(Còn\s*\d+\s*sản phẩm)/i]),
    branchesInStockText: null,
    price,
    originalPrice,
    flashSalePrice: price,
    discountPct: parseDiscountPct(cleanText(discountRaw?.split(' ')[0])) || calcDiscountPct(price, originalPrice),
    description,
    benefits,
    usage,
    ingredients,
    breadcrumb: await page.locator('.breadcrumb a, .bread-crumb a').allTextContents().catch(() => []),
    galleryImages,
    crawledAt,
  };
}