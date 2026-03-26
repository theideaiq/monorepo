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

  const mockApple = { id: 'apple-id', productId: 'p1', title: 'Apple', price: 10, image: 'apple.png' };
  const mockBanana = { id: 'banana-id', productId: 'p2', title: 'Banana', price: 15, image: 'banana.png' };

  it('should add items to the cart', () => {
    const { addItem } = useCartStore.getState();

    addItem(mockApple);
    expect(useCartStore.getState().items).toEqual([{ ...mockApple, quantity: 1 }]);
    expect(useCartStore.getState().total).toBe(10);

    addItem(mockBanana);
    expect(useCartStore.getState().items).toEqual([{ ...mockApple, quantity: 1 }, { ...mockBanana, quantity: 1 }]);
    expect(useCartStore.getState().total).toBe(25);
  });

  it('should update quantity of existing items instead of duplicating', () => {
    const { addItem } = useCartStore.getState();

    addItem(mockApple);
    addItem(mockApple);
    expect(useCartStore.getState().items).toEqual([{ ...mockApple, quantity: 2 }]);
    expect(useCartStore.getState().total).toBe(20);
  });

  it('should remove items from the cart', () => {
    const { addItem, removeItem } = useCartStore.getState();

    addItem(mockApple);
    addItem(mockBanana);

    removeItem('apple-id');
    expect(useCartStore.getState().items).toEqual([{ ...mockBanana, quantity: 1 }]);
    expect(useCartStore.getState().total).toBe(15);
  });

  it('should update item quantity', () => {
    const { addItem, updateQuantity } = useCartStore.getState();

    addItem(mockApple);
    updateQuantity('apple-id', 5);

    expect(useCartStore.getState().items).toEqual([{ ...mockApple, quantity: 5 }]);
    expect(useCartStore.getState().total).toBe(50);
  });

  it('should ignore quantity update if less than 1', () => {
    const { addItem, updateQuantity } = useCartStore.getState();

    addItem(mockApple);
    updateQuantity('apple-id', 0);

    expect(useCartStore.getState().items).toEqual([{ ...mockApple, quantity: 1 }]);
    expect(useCartStore.getState().total).toBe(10);
  });

  it('should clear the cart', () => {
    const { addItem, clearCart } = useCartStore.getState();

    addItem(mockApple);
    addItem(mockBanana);

    clearCart();
    expect(useCartStore.getState().items).toEqual([]);
    expect(useCartStore.getState().total).toBe(0);
  });

  it('should persist state to localStorage', () => {
    const { addItem } = useCartStore.getState();
    addItem(mockApple);

    const stored = localStorage.getItem('cart-storage-v2');
    expect(stored).toBeDefined();
    if (stored) {
      const parsed = JSON.parse(stored);
      expect(parsed.state.items).toEqual([{ ...mockApple, quantity: 1 }]);
      expect(parsed.state.total).toBe(10);
    }
  });
});
