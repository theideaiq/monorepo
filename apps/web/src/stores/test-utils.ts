import type { CartItem } from './cart-store';

export const createMockCartItem = (
  id: string,
  price = 100,
): Omit<CartItem, 'quantity'> => ({
  id,
  productId: `product-${id}`,
  title: `Product ${id}`,
  price,
  image: `https://example.com/${id}.jpg`,
});
