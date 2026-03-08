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
    id: 'apple',
    productId: 'apple-id',
    title: 'Apple',
    price: 100,
    image: 'apple.png',
  };
  const mockBanana = {
    id: 'banana',
    productId: 'banana-id',
    title: 'Banana',
    price: 200,
    image: 'banana.png',
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

    removeItem('apple');
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

  it('should handle duplicate items correctly (removes all instances)', () => {
    // Current behavior documentation: removing an item removes ALL instances of that value
    const { addItem, removeItem } = useCartStore.getState();

    addItem(mockApple);
    addItem(mockApple);
    expect(useCartStore.getState().items).toEqual([
      { ...mockApple, quantity: 2 },
    ]);

    removeItem('apple');
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
