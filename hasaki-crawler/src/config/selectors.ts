export const SELECTORS = {
  category: {
    menuLinks: 'a[href*="/danh-muc/"]',
    pageTitle: 'h1',
  },

  listing: {
    productLinks: 'a[href*="/san-pham/"]',

    card: [
      '.ProductGridItem__itemOuter',
      '.item_sp_hasaki',
      '.item-product',
      '[class*="product-item"]',
      '[class*="productItem"]',
      '[class*="product"]',
      '[class*="Product"]',
    ].join(', '),

    nameLink: 'a[href*="/san-pham/"]',
    imageLink: 'a[href*="/san-pham/"]',
    image: 'img',

    priceNow: [
      '.txt_price',
      '.price',
      '.item-price',
      '[class*="price"]',
    ].join(', '),

    priceOld: [
      '.txt_price_market',
      '.price_old',
      '.old-price',
      '[class*="old"]',
      '[class*="market"]',
    ].join(', '),

    discount: [
      '.txt_discount',
      '.discount_percent',
      '[class*="discount"]',
    ].join(', '),

    brand: [
      '.txt_nhan_hieu',
      '.item-brand',
      '[class*="brand"]',
    ].join(', '),

    sales: [
      '.txt_quantity_sold',
      '[class*="sold"]',
    ].join(', '),

    rating: [
      '.txt_rate',
      '[class*="rating"]',
    ].join(', '),

    paginationNext: [
      'a[rel="next"]',
      '.paging a.next',
      '.pagination a.next',
    ].join(', '),

    pageBody: 'body',
  },

  detail: {
    breadcrumbLinks: '.breadcrumb a',
    brand: '.txt_nhan_hieu a, .product-brand a, [class*="brand"] a',
    name: 'h1',
    priceNow: '.txt_price, .price_now, [class*="price"]',
    priceOld: '.txt_price_market, .price_market, .old-price',
    discount: '.txt_discount, .discount_percent, [class*="discount"]',
    description: '.box_thong_tin_sp, .content-chi-tiet, .product-description',
    galleryImages: '.swiper-slide img, .box-image img, .gallery img',
    pageBody: 'body',
  },
} as const;