import fs from 'fs';
import path from 'path';
import { pipeline } from '@huggingface/transformers';
import cosineSimilarity from 'compute-cosine-similarity';
import { extractSizeTag, cleanTextForAI, slugify } from '../utils/normalize';

const PROJECT_ROOT = path.join(__dirname, '../../');
const HASAKI_FILE = path.join(PROJECT_ROOT, 'hasaki-crawler/storage/output/normalized-products.json');
const COCOLUX_FILE = path.join(PROJECT_ROOT, 'cocolux-crawler/storage/output/details.json');
const OUTPUT_DIR = path.join(__dirname, '../../storage/output');
const MASTER_DB_FILE = path.join(OUTPUT_DIR, 'master-products.json');

const SIMILARITY_THRESHOLD = 0.88;

interface ProductCluster {
  clusterId: string;
  masterBrand: string;
  masterName: string;
  masterVector: number[];
  sizeTag: string | null;
  members: any[];
}

export async function runAIClustering() {
  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  if (!fs.existsSync(HASAKI_FILE) || !fs.existsSync(COCOLUX_FILE)) {
    console.error("❌ Không tìm thấy file dữ liệu.");
    return;
  }

  const hasakiRaw: any[] = JSON.parse(fs.readFileSync(HASAKI_FILE, 'utf-8'));
  const cocoluxRaw: any[] = JSON.parse(fs.readFileSync(COCOLUX_FILE, 'utf-8'));

  console.log('⏳ Khởi động AI...');
  const extractor = await pipeline('feature-extraction', 'Xenova/paraphrase-multilingual-MiniLM-L12-v2');

  const allProducts = [
    ...hasakiRaw.map(p => ({ ...p, platform: 'hasaki' })),
    ...cocoluxRaw.map(p => ({ ...p, platform: 'cocolux' }))
  ];

  const clusters: ProductCluster[] = [];

  for (let i = 0; i < allProducts.length; i++) {
    const product = allProducts[i];
    const cleanName = cleanTextForAI(product.name);
    const sizeTag = extractSizeTag(product.name);
    
    const output = await extractor(`${product.brandName} ${cleanName}`, { pooling: 'mean', normalize: true });
    const productVector = Array.from(output.data) as number[];

    let bestCluster: ProductCluster | null = null;
    let highestScore = -1;

    for (const cluster of clusters) {
      if (cluster.masterBrand?.toLowerCase() !== product.brandName?.toLowerCase()) continue;
      if (cluster.sizeTag !== sizeTag) continue; // Khóa chặt Size và Chiều dài

      const score = cosineSimilarity(productVector, cluster.masterVector);
      if (score !== null && score > highestScore) {
        highestScore = score;
        bestCluster = cluster;
      }
    }

    // 🌟 GIỮ TOÀN BỘ TRƯỜNG VÀ CHUẨN HÓA CHO DB
    const memberData = {
      ...product, // Giữ lại ID cũ, Category gốc, Description, Benefits...
      matchScore: bestCluster ? highestScore.toFixed(3) : "1.000",
      
      // Các trường mapping trực tiếp vào bảng product_listing & price_record
      db_platform_name: product.platform,
      db_url: product.url || product.productUrl,
      db_image: product.imageUrl || (product.galleryImages && product.galleryImages[0]),
      db_current_price: product.price,
      db_original_price: product.originalPrice || product.price,
      db_discount_pct: product.discountPct || 0,
      db_in_stock: product.inStock !== undefined ? product.inStock : true
    };

    if (highestScore >= SIMILARITY_THRESHOLD && bestCluster) {
      bestCluster.members.push(memberData);
    } else {
      clusters.push({
        clusterId: `MASTER_${1000 + clusters.length}`,
        masterBrand: product.brandName,
        masterName: product.name,
        masterVector: productVector,
        sizeTag: sizeTag,
        members: [memberData]
      });
    }

    if (i % 20 === 0) process.stdout.write(`🔄 Đang xử lý: ${i + 1}/${allProducts.length}...\r`);
  }

  // 🌟 ĐỊNH DẠNG ĐẦU RA KHỚP 100% VỚI CÁC BẢNG DB
  const finalOutput = clusters.map(c => {
    // Lấy member đầu tiên làm đại diện cho thông tin chung của Product
    const rep = c.members[0];

    return {
      // 1. Dữ liệu cho bảng Brand
      brand: {
        name: c.masterBrand,
        slug: slugify(c.masterBrand)
      },
      // 2. Dữ liệu cho bảng Product
      product: {
        name: c.masterName,
        slug: slugify(c.masterName),
        barcode: rep.barcode || null,
        description: rep.description || null,
        skin_type: rep.skin_type || null,
        volume_ml: c.sizeTag,
        category_name: rep.categoryName || "Chưa phân loại",
        // Chứa các trường linh tinh vào JSONB attributes của bạn
        attributes: {
          benefits: rep.benefits || null,
          usage: rep.usage || null,
          ingredients: rep.ingredients || null
        }
      },
      // 3. Danh sách cho bảng Product_Listing & Price_Record
      listings: c.members
    };
  });

  fs.writeFileSync(MASTER_DB_FILE, JSON.stringify(finalOutput, null, 2), 'utf-8');
  console.log(`\n\n🎉 THÀNH CÔNG! Đã xuất file khớp với Schema DB.`);
}