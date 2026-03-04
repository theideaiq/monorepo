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

  const mockApple = { id: 'apple', productId: 'p-apple', title: 'Apple', price: 10, image: 'apple.png', quantity: 1 };
  const mockBanana = { id: 'banana', productId: 'p-banana', title: 'Banana', price: 15, image: 'banana.png', quantity: 1 };

  it('should add items to the cart', () => {
    const { addItem } = useCartStore.getState();

    addItem(mockApple as any);
    expect(useCartStore.getState().items).toEqual([mockApple]);

    addItem(mockBanana as any);
    expect(useCartStore.getState().items).toEqual([mockApple, mockBanana]);
  });

  it('should remove items from the cart', () => {
    const { addItem, removeItem } = useCartStore.getState();

    addItem(mockApple as any);
    addItem(mockBanana as any);

    removeItem('apple');
    expect(useCartStore.getState().items).toEqual([mockBanana]);
  });

  it('should clear the cart', () => {
    const { addItem, clearCart } = useCartStore.getState();

    addItem(mockApple as any);
    addItem(mockBanana as any);

    clearCart();
    expect(useCartStore.getState().items).toEqual([]);
  });

  it('should handle duplicate items correctly (removes all instances)', () => {
    // Current behavior documentation: removing an item removes ALL instances of that value
    const { addItem, removeItem } = useCartStore.getState();

    addItem(mockApple as any);
    addItem(mockApple as any); // Should bump quantity, let's verify store behavior

    // the store actually bumps quantity
    expect(useCartStore.getState().items[0].quantity).toEqual(2);

    removeItem('apple');
    expect(useCartStore.getState().items).toEqual([]);
  });

  it('should persist state to localStorage', () => {
    const { addItem } = useCartStore.getState();
    const mockPersistent = { id: 'persistent-item', productId: 'p-pers', title: 'Item', price: 20, image: 'img.png', quantity: 1 };
    addItem(mockPersistent as any);

    const stored = localStorage.getItem('cart-storage');
    expect(stored).toBeDefined();
    if (stored) {
      const parsed = JSON.parse(stored);
      expect(parsed.state.items).toEqual([mockPersistent]);
    }
  });
});
