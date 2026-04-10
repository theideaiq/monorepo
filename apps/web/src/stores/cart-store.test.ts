import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useCartStore } from './cart-store';

describe('Cart Store', () => {
  // Reset store before each test to ensure isolation
  beforeEach(() => {
    useCartStore.setState({ items: [], total: 0 });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('should start with an empty cart', () => {
    const { items } = useCartStore.getState();
    expect(items).toEqual([]);
  });

  const mockApple = { id: 'apple-id', productId: 'p1', title: 'Apple', price: 10, image: 'apple.png' };
  const mockBanana = { id: 'banana-id', productId: 'p2', title: 'Banana', price: 20, image: 'banana.png' };

  it('should add items to the cart', () => {
    const { addItem } = useCartStore.getState();

    addItem(mockApple);
    expect(useCartStore.getState().items).toEqual([{ ...mockApple, quantity: 1 }]);

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

    removeItem('apple-id');
    expect(useCartStore.getState().items).toEqual([{ ...mockBanana, quantity: 1 }]);
  });

  it('should clear the cart', () => {
    const { addItem, clearCart } = useCartStore.getState();

    addItem(mockApple);
    addItem(mockBanana);

    clearCart();
    expect(useCartStore.getState().items).toEqual([]);
  });

  it('should handle duplicate items correctly (removes all instances)', () => {
    // Current behavior documentation: adding same item increases quantity, removing removes the item entirely
    const { addItem, removeItem } = useCartStore.getState();

    addItem(mockApple);
    addItem(mockApple);
    expect(useCartStore.getState().items).toEqual([{ ...mockApple, quantity: 2 }]);

    removeItem('apple-id');
    expect(useCartStore.getState().items).toEqual([]);
  });

  it('should persist state to localStorage', () => {
    const { addItem } = useCartStore.getState();
    const mockPersistent = { id: 'persistent-id', productId: 'p3', title: 'Persistent', price: 5, image: 'p.png' };
    addItem(mockPersistent);

    const stored = localStorage.getItem('cart-storage-v2');
    expect(stored).toBeDefined();
    if (stored) {
      const parsed = JSON.parse(stored);
      expect(parsed.state.items).toEqual([{ ...mockPersistent, quantity: 1 }]);
    }
  });

  it('should handle updating quantities and recalculating totals correctly (boundaries: >= 1)', () => {
    const { addItem, updateQuantity } = useCartStore.getState();

    // 1. Initial State Check
    expect(useCartStore.getState().total).toBe(0);

    // 2. Add Item & Verify total
    addItem(mockApple); // price: 10
    expect(useCartStore.getState().items[0]?.quantity).toBe(1);
    expect(useCartStore.getState().total).toBe(10);

    // 3. Update quantity & Verify total
    updateQuantity('apple-id', 5);
    expect(useCartStore.getState().items[0]?.quantity).toBe(5);
    expect(useCartStore.getState().total).toBe(50); // 10 * 5 = 50

    // 4. Boundary check: Attempting to set quantity < 1 should be ignored
    updateQuantity('apple-id', 0);
    // Based on the store implementation, quantity < 1 returns the current state
    expect(useCartStore.getState().items[0]?.quantity).toBe(5);
    expect(useCartStore.getState().total).toBe(50);

    updateQuantity('apple-id', -5);
    expect(useCartStore.getState().items[0]?.quantity).toBe(5);
    expect(useCartStore.getState().total).toBe(50);
  });
});
