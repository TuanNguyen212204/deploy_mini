import React from 'react';
import { Heart, Trash2 } from 'lucide-react'; // Thêm Trash2
import { Link } from 'react-router-dom';
import Badge from '../common/Badge';
import type { Product } from '../../types/product';
import { useWishlist } from '../../context/WishlistContext'; // Import context

const FONT_STACK = {
  serif: '"Times New Roman", Georgia, serif',
  sans:
    'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
} as const;

// THÊM: prop isWishlistPage để linh hoạt hiển thị nút
type ProductCardProps = {
  product: Product;
  isWishlistPage?: boolean; 
};

const formatPrice = (price: number): string =>
  new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(price);

export default function ProductCard({ product, isWishlistPage = false }: ProductCardProps) {
  // Lấy các hàm logic từ Context
  const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();
  const isFavorite = isInWishlist(product.id);

  const bestOffer = [...product.platforms].sort(
    (a, b) => a.finalPrice - b.finalPrice,
  )[0];

  // Xử lý click nút (ngăn chặn nổi bọt sự kiện để không bị nhảy vào trang chi tiết)
  const handleWishlistAction = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (isWishlistPage || isFavorite) {
      removeFromWishlist(product.id);
    } else {
      addToWishlist(product);
    }
  };

  return (
    <Link to={`/product/${product.id}`} className="group block">
      <article className="glass shadow-soft overflow-hidden rounded-[32px] p-5 transition-all duration-500 hover:-translate-y-1.5 hover:shadow-[0_25px_60px_rgba(15,23,42,0.08)]">
        <div className="relative overflow-hidden rounded-[26px] bg-[#F6F1EB]">
          <img
            src={product.images[0]}
            alt={product.name}
            className="aspect-[4/5] w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
          />

          <div className="absolute inset-0 bg-gradient-to-t from-black/10 via-black/0 to-white/10" />

          {/* SỬA: Nút tương tác linh hoạt */}
          <button
            type="button"
            onClick={handleWishlistAction}
            className={`absolute right-4 top-4 rounded-full border border-white/40 bg-white/70 p-2.5 shadow-[0_8px_20px_rgba(15,23,42,0.08)] backdrop-blur-md transition-all duration-300 hover:scale-[1.04] ${
              isFavorite ? 'text-[#8E6A72]' : 'text-stone-500'
            }`}
            aria-label={isWishlistPage ? "Xóa khỏi danh sách" : "Lưu sản phẩm"}
          >
            {isWishlistPage ? (
              <Trash2 size={15} className="hover:text-red-500" />
            ) : (
              <Heart size={15} fill={isFavorite ? "currentColor" : "none"} />
            )}
          </button>
        </div>

        <div className="mt-6">
          <div className="flex items-center justify-between gap-3">
            <span className="caption-soft text-[10px] font-medium uppercase text-[#8E6A72]">
              {product.brand}
            </span>

            <span className="text-xs text-stone-400">
              {product.rating} · {product.reviews.toLocaleString('vi-VN')} reviews
            </span>
          </div>

          <h3
            className="editorial-title mt-3 line-clamp-2 text-[1.45rem] text-stone-900 transition-colors duration-300 group-hover:text-[#8E6A72]"
            style={{ fontFamily: FONT_STACK.serif }}
          >
            {product.name}
          </h3>

          <div className="mt-4 flex flex-wrap gap-2">
            {!product.insight.isFakeDiscountRisk && (
              <Badge variant="brand">Deal tuyển chọn</Badge>
            )}

            {product.insight.isLowest30Days && (
              <Badge variant="soft">Giá đẹp 30 ngày</Badge>
            )}
          </div>

          <div className="mt-5 flex items-baseline gap-3">
            <span className="text-[1.4rem] font-semibold tracking-tight text-stone-900">
              {formatPrice(bestOffer.finalPrice)}
            </span>

            <span className="text-sm text-stone-300 line-through">
              {formatPrice(bestOffer.originalPrice)}
            </span>
          </div>

          <p className="mt-4 text-sm leading-7 text-stone-500 line-clamp-2">
            {product.insight.summary}
          </p>
        </div>
      </article>
    </Link>
  );
}