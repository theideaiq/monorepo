import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useCartStore } from './cart-store';

describe('Cart Store', () => {
  // Reset store before each test to ensure isolation
  beforeEach(() => {
    useCartStore.setState({ items: [] });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('should start with an empty cart', () => {
    const { items } = useCartStore.getState();
    expect(items).toEqual([]);
  });

  const mockApple = {
    id: 'apple-1',
    productId: 'prod-apple',
    title: 'Apple',
    price: 1.5,
    image: 'apple.jpg',
  };

  const mockBanana = {
    id: 'banana-1',
    productId: 'prod-banana',
    title: 'Banana',
    price: 2.0,
    image: 'banana.jpg',
  };

  it('should add items to the cart', () => {
    const { addItem } = useCartStore.getState();

    addItem(mockApple);
    expect(useCartStore.getState().items).toEqual([
      { ...mockApple, quantity: 1 },
    ]);

    addItem(mockBanana);
    expect(useCartStore.getState().items).toEqual([
      { ...mockApple, quantity: 1 },
      { ...mockBanana, quantity: 1 },
    ]);
  });

  it('should remove items from the cart', () => {
    const { addItem, removeItem } = useCartStore.getState();

    addItem(mockApple);
    addItem(mockBanana);

    removeItem(mockApple.id);
    expect(useCartStore.getState().items).toEqual([
      { ...mockBanana, quantity: 1 },
    ]);
  });

  it('should clear the cart', () => {
    const { addItem, clearCart } = useCartStore.getState();

    addItem(mockApple);
    addItem(mockBanana);

    clearCart();
    expect(useCartStore.getState().items).toEqual([]);
  });

  it('should handle duplicate items correctly (increments quantity)', () => {
    const { addItem, removeItem } = useCartStore.getState();

    addItem(mockApple);
    addItem(mockApple);
    expect(useCartStore.getState().items).toEqual([
      { ...mockApple, quantity: 2 },
    ]);

    removeItem(mockApple.id);
    expect(useCartStore.getState().items).toEqual([]);
  });

  it('should persist state to localStorage', () => {
    const { addItem } = useCartStore.getState();
    addItem(mockApple);

    const stored = localStorage.getItem('cart-storage-v2');
    expect(stored).toBeDefined();
    if (stored) {
      const parsed = JSON.parse(stored);
      expect(parsed.state.items).toEqual([{ ...mockApple, quantity: 1 }]);
    }
  });
});
