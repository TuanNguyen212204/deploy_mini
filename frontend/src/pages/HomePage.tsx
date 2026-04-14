import React, { useMemo, useState, useEffect } from 'react'; 
import { ArrowRight, Search } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios'; 

import Badge from '../components/common/Badge';
import ProductCard from '../components/product/ProductCard';
import AppHeader from '../components/layout/AppHeader';

const FONT_STACK = {
  serif: '"Times New Roman", Georgia, serif',
  sans: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
} as const;

export default function HomePage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // 1. GỌI API LẤY DANH SÁCH SẢN PHẨM TỪ DATABASE
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        // Hằng đảm bảo Backend có endpoint này và đã bật @CrossOrigin
        const response = await axios.get('http://localhost:8080/api/products');
        setProducts(response.data);
      } catch (error) {
        console.error("Lỗi kết nối Backend:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  // 2. LOGIC LỌC SẢN PHẨM NỔI BẬT (Dựa trên data thật)
  const homeHighlights = useMemo(() => {
    // Lấy 6 sản phẩm mới nhất hoặc có điểm popularity cao nhất từ DB
    return products.slice(0, 6);
  }, [products]);

  const featuredProduct = useMemo(() => {
    return products[0] || null;
  }, [products]);

  const handleSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!query.trim()) return;
    navigate(`/search?q=${encodeURIComponent(query.trim())}`);
  };

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#FCF8F4]">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#B7848C]"></div>
      <p className="mt-4 text-stone-500">Đang tải dữ liệu từ PriceHawk...</p>
    </div>
  );
  
  if (products.length === 0) return (
    <div className="min-h-screen flex items-center justify-center bg-[#FCF8F4]">
      <p className="text-stone-500">Chưa có sản phẩm nào trong Database.</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#FCF8F4] text-stone-900" style={{ fontFamily: FONT_STACK.sans }}>
      <AppHeader currentPage="home" />

      <main className="mx-auto max-w-7xl px-6 pb-24 pt-36 lg:px-12">
        {/* HERO SECTION */}
        <section className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div>
            <h1 className="text-6xl leading-[0.98] tracking-[-0.03em] md:text-7xl" style={{ fontFamily: FONT_STACK.serif }}>
              Mua sắm tinh tế, thấy đúng <span className="text-[#B7848C]">giá đẹp</span>.
            </h1>
            
            <form onSubmit={handleSearchSubmit} className="mt-9 rounded-[34px] border border-white bg-white/80 p-4 shadow-sm backdrop-blur-md">
              <div className="flex flex-col gap-3 md:flex-row">
                <div className="relative flex-1">
                  <Search className="absolute left-5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
                  <input 
                    value={query} 
                    onChange={(e) => setQuery(e.target.value)} 
                    placeholder="Tìm sản phẩm từ Database..." 
                    className="w-full rounded-full bg-stone-100/50 py-4 pl-12 pr-5 text-sm outline-none" 
                  />
                </div>
                <button className="rounded-full bg-[#1F1A17] px-8 py-4 text-sm font-medium text-white transition hover:scale-105">
                  Tìm kiếm
                </button>
              </div>
            </form>
          </div>

          {/* FEATURED PRODUCT CARD */}
          {featuredProduct && (
            <div className="rounded-[36px] bg-white p-5 shadow-sm">
              <div className="relative overflow-hidden rounded-[28px] bg-[#F5EEE8]">
                <img 
                  src={featuredProduct.imageUrl || featuredProduct.image_url} 
                  alt={featuredProduct.name} 
                  className="aspect-[4/5] w-full object-cover" 
                />
              </div>
              <div className="mt-6">
                <Badge variant="brand">Nổi bật</Badge>
                <h2 className="mt-3 text-3xl" style={{ fontFamily: FONT_STACK.serif }}>{featuredProduct.name}</h2>
                <Link to={`/product/${featuredProduct.id}`} className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-stone-600">
                  Xem chi tiết <ArrowRight size={16} />
                </Link>
              </div>
            </div>
          )}
        </section>

        {/* PRODUCTS GRID */}
        <section className="mt-24">
          <h2 className="text-3xl md:text-4xl mb-8" style={{ fontFamily: FONT_STACK.serif }}>Sản phẩm mới cập nhật</h2>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
            {homeHighlights.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}