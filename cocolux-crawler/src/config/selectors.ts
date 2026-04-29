export const SELECTORS = {
  category: {
    menuLinks: 'a[href*="/danh-muc/"]',
    pageTitle: 'h1, .title-page, .title-cate',
  },

  listing: {
    card: '.list-product-index .item-product, .item-product',
    nameLink: 'h3 a, .title-product a, a[title]',
    imageLink: 'a.img, a[href*="-i."]',
    image: 'a.img img, img',
    priceNow: '.price .now, .price-now, .price-sales',
    priceOld: '.price .old, .price-old, .price-origin',
    discount: '.discount, .sale, .percent-discount',
    brand: '.trademark a, .trademark, .brand a, .brand',
    sales: '.sale-info, .sold, .count-sale',
    rating: '.star p, .star, .rating',
    productCountText: 'body',
  },

  detail: {
    breadcrumbLinks: '.breadcrumb a, .bread-crumb a, nav.breadcrumb a',
brand: '.product-brand a, .brand a, .trademark a',    
    name: 'h1, .product-name, .detail-product-name',

    // Giá
    priceNow: '.price .now, .product-price .now, .box-price .price-now, .price-sales',
    priceOld: '.price .old, .product-price .old, .box-price .price-old, .price-origin',
    discount: '.discount, .product-price .sale, .box-price .discount',

    // Nội dung
    description:
      '.product-content, .content-product, .tab-content, .detail-content, .product-detail-content, .box-content-detail',

    // Ảnh
    galleryImages: '.product-images img, .swiper-slide img, .gallery-top img, .box-image img',

    // Fallback text toàn trang để regex, nhưng chỉ dùng chọn lọc
    pageBody: 'body',
  },
} as const;