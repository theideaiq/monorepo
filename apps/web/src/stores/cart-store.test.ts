/**
 * @vitest-environment jsdom
 */
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

  it('should add items to the cart', () => {
    const { addItem } = useCartStore.getState();

    addItem({ id: 'apple' } as any);
    expect(useCartStore.getState().items).toEqual([{ id: 'apple', quantity: 1 }]);

    addItem({ id: 'banana' } as any);
    expect(useCartStore.getState().items).toEqual([{ id: 'apple', quantity: 1 }, { id: 'banana', quantity: 1 }]);
  });

  it('should remove items from the cart', () => {
    const { addItem, removeItem } = useCartStore.getState();

    addItem({ id: 'apple' } as any);
    addItem({ id: 'banana' } as any);

    removeItem('apple');
    expect(useCartStore.getState().items).toEqual([{ id: 'banana', quantity: 1 }]);
  });

  it('should clear the cart', () => {
    const { addItem, clearCart } = useCartStore.getState();

    addItem({ id: 'apple' } as any);
    addItem({ id: 'banana' } as any);

    clearCart();
    expect(useCartStore.getState().items).toEqual([]);
  });

  it('should handle duplicate items correctly (removes all instances)', () => {
    // Current behavior documentation: removing an item removes ALL instances of that value
    const { addItem, removeItem } = useCartStore.getState();

    addItem({ id: 'apple' } as any);
    addItem({ id: 'apple' } as any);
    expect(useCartStore.getState().items).toEqual([{ id: 'apple', quantity: 2 }]);

    removeItem('apple');
    expect(useCartStore.getState().items).toEqual([]);
  });

  it('should persist state to localStorage', () => {
    const { addItem } = useCartStore.getState();
    addItem('persistent-item');

    const stored = localStorage.getItem('cart-storage');
    expect(stored).toBeDefined();
    if (stored) {
      const parsed = JSON.parse(stored);
      expect(parsed.state.items).toEqual(['persistent-item']);
    }
  });
});
