import type { CartItem } from './cart-store';

export const createMockCartItem = (overrides?: Partial<CartItem>): CartItem => {
  return {
    id: 'test-item-1',
    productId: 'product-1',
    title: 'Test Product',
    price: 100,
    image: '/test-image.jpg',
    quantity: 1,
    ...overrides,
  };
};
