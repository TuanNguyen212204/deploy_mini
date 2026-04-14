import { Client } from 'pg';
import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import dns from 'dns';

// Ép Node.js ưu tiên IPv4 để tránh lỗi ENOTFOUND lúc nãy
dns.setDefaultResultOrder('ipv4first');

const MASTER_DATA_PATH = path.join(__dirname, '../../storage/output/master-products.json');
const BACKEND_CONFIG_PATH = path.join(__dirname, '../../backend/src/main/resources/application.yml');

async function importJsonToDb() {
  try {
    // 1. Đọc password từ application.yml (để không phải ghi đè pass vào code)
    console.log("📖 Đang lấy mật khẩu từ backend...");
    const yamlContent = fs.readFileSync(BACKEND_CONFIG_PATH, 'utf8');
    const config: any = yaml.load(yamlContent);
    const dbPassword = config.spring.datasource.password;

    // 2. Cấu hình kết nối bằng thông tin Pooler mới
    const client = new Client({
      host: 'aws-1-ap-northeast-2.pooler.supabase.com',
      port: 5432,
      database: 'postgres',
      user: 'postgres.astkanfsacxriwprspqr', // Username mới của Pooler
      password: dbPassword,
      ssl: { rejectUnauthorized: false }
    });

    console.log("⏳ Đang kết nối tới Supabase Pooler...");
    await client.connect();
    console.log("✅ Kết nối thành công!");

    // 3. Đọc dữ liệu và chèn vào DB
    const data = JSON.parse(fs.readFileSync(MASTER_DATA_PATH, 'utf-8'));
    await client.query('BEGIN');

    for (const entry of data) {
      // --- A. Brand ---
      // A. Xử lý Brand (Xử lý trùng theo slug)
const brandRes = await client.query(
  `INSERT INTO brand (name, slug) VALUES ($1, $2) 
   ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name 
   RETURNING id`,
  [entry.brand.name, entry.brand.slug]
);
const brandId = brandRes.rows[0].id;

    // B. Xử lý Category (Xử lý trùng theo slug)
const cateRes = await client.query(
  `INSERT INTO category (name, slug) VALUES ($1, $2) 
   ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name 
   RETURNING id`,
  [entry.product.category_name, entry.product.category_name.toLowerCase().replace(/ /g, '-')]
);
const categoryId = cateRes.rows[0].id;

      // --- C. Product ---
      const prodRes = await client.query(
        `INSERT INTO product (name, brand_id, category_id, barcode, description, volume_ml, attributes, popularity_score) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
         ON CONFLICT (name) DO UPDATE SET updated_at = NOW() RETURNING id`,
        [
          entry.product.name, brandId, categoryId, entry.product.barcode,
          entry.product.description, entry.product.volume_ml, JSON.stringify(entry.product.attributes), 0
        ]
      );
      const productId = prodRes.rows[0].id;

      // --- D. Listings & Price Records ---
     // --- D. Listings & Price Records ---
for (const store of entry.listings || entry.stores || []) {
  const platformId = store.platform === 'hasaki' ? 1 : 2;

  // 1. Chèn Listing
  const listRes = await client.query(
    `INSERT INTO product_listing (product_id, platform_id, platform_name, url, platform_image_url, is_fake_promo, is_pinned, status, trust_score) 
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
     ON CONFLICT (url) DO UPDATE SET updated_at = NOW() RETURNING id`,
    [
      productId, 
      platformId, 
      store.platform, 
      store.db_url || store.url, // Lấy db_url, nếu không có thì lấy url
      store.db_image || store.imageUrl || (store.galleryImages && store.galleryImages[0]), 
      false, false, 'active', 1.0
    ]
  );
  const listingId = listRes.rows[0].id;

  // 2. Chèn Price Record (ĐOẠN NÀY LÀ NƠI GÂY LỖI)
  // Giải pháp: Dùng toán tử || để lấy bất cứ trường nào có giá trị
  const currentPrice = store.db_current_price || store.price || 0; 
  const originalPrice = store.db_original_price || store.originalPrice || currentPrice;

  await client.query(
    `INSERT INTO price_record (product_listing_id, price, original_price, discount_pct, in_stock) 
     VALUES ($1, $2, $3, $4, $5)`,
    [
      listingId, 
      currentPrice,   // Đảm bảo không bị null
      originalPrice,  // Đảm bảo không bị null
      store.db_discount_pct || store.discountPct || 0, 
      store.db_in_stock !== undefined ? store.db_in_stock : (store.inStock !== undefined ? store.inStock : true)
    ]
  );
}
      console.log(`✔ Đã xử lý: ${entry.product.name}`);
    }

    await client.query('COMMIT');
    console.log("🎉 XONG! Dữ liệu đã được đồng bộ hoàn toàn.");
  } catch (err) {
    console.error("❌ Lỗi Import:", err);
  }
}

importJsonToDb();