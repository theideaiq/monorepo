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

  const mockApple = { id: 'apple', productId: 'p-apple', title: 'Apple', price: 10, image: 'apple.png' };
  const mockBanana = { id: 'banana', productId: 'p-banana', title: 'Banana', price: 15, image: 'banana.png' };
  const mockPersistent = { id: 'persistent-item', productId: 'p-persist', title: 'Persist', price: 20, image: 'persist.png' };

  it('should start with an empty cart', () => {
    const { items, totalQuantity } = useCartStore.getState();
    expect(items).toEqual([]);
    expect(totalQuantity).toEqual(0);
  });

  it('should add items to the cart', () => {
    const { addItem } = useCartStore.getState();

    addItem(mockApple);
    expect(useCartStore.getState().items).toEqual([{ ...mockApple, quantity: 1 }]);
    expect(useCartStore.getState().totalQuantity).toEqual(1);

    addItem(mockBanana);
    expect(useCartStore.getState().items).toEqual([{ ...mockApple, quantity: 1 }, { ...mockBanana, quantity: 1 }]);
    expect(useCartStore.getState().totalQuantity).toEqual(2);
  });

  it('should remove items from the cart', () => {
    const { addItem, removeItem } = useCartStore.getState();

    addItem(mockApple);
    addItem(mockBanana);

    removeItem('apple');
    expect(useCartStore.getState().items).toEqual([{ ...mockBanana, quantity: 1 }]);
    expect(useCartStore.getState().totalQuantity).toEqual(1);
  });

  it('should clear the cart', () => {
    const { addItem, clearCart } = useCartStore.getState();

    addItem(mockApple);
    addItem(mockBanana);

    clearCart();
    expect(useCartStore.getState().items).toEqual([]);
    expect(useCartStore.getState().totalQuantity).toEqual(0);
  });

  it('should handle duplicate items correctly (removes all instances)', () => {
    // Current behavior documentation: removing an item removes ALL instances of that value
    // With quantity updates, it combines duplicate items
    const { addItem, removeItem } = useCartStore.getState();

    addItem(mockApple);
    addItem(mockApple);
    expect(useCartStore.getState().items).toEqual([{ ...mockApple, quantity: 2 }]);
    expect(useCartStore.getState().totalQuantity).toEqual(2);

    removeItem('apple');
    expect(useCartStore.getState().items).toEqual([]);
    expect(useCartStore.getState().totalQuantity).toEqual(0);
  });

  it('should persist state to localStorage', () => {
    const { addItem } = useCartStore.getState();
    addItem(mockPersistent);

    // Update test to check for v2 storage key
    const stored = localStorage.getItem('cart-storage-v2');
    expect(stored).toBeDefined();
    if (stored) {
      const parsed = JSON.parse(stored);
      expect(parsed.state.items).toEqual([{ ...mockPersistent, quantity: 1 }]);
      expect(parsed.state.totalQuantity).toEqual(1);
    }
  });
});
