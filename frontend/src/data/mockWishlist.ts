export type WishlistItem = {
  id: string;
  productId: string;
  addedAt: string;
  alertEnabled: boolean;
  nearTarget: boolean;
  priceChanged7dPercent: number;
};

export const mockWishlist: WishlistItem[] = [
  {
    id: 'wishlist-1',
    productId: '10000000-0000-0000-0000-000000000002',
    addedAt: '2026-04-01T08:00:00Z',
    alertEnabled: true,
    nearTarget: true,
    priceChanged7dPercent: -6.7,
  },
  {
    id: 'wishlist-2',
    productId: '10000000-0000-0000-0000-000000000009',
    addedAt: '2026-04-03T12:30:00Z',
    alertEnabled: false,
    nearTarget: false,
    priceChanged7dPercent: -13.1,
  },
  {
    id: 'wishlist-3',
    productId: '0b3eab2c-dc2c-4443-81fa-cb48204e13c5',
    addedAt: '2026-04-05T18:45:00Z',
    alertEnabled: true,
    nearTarget: true,
    priceChanged7dPercent: -7.5,
  },
];