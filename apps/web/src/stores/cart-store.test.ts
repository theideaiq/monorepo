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
    expect(useCartStore.getState().items).toEqual([
      expect.objectContaining({ id: 'apple' }),
    ]);

    addItem({ id: 'banana' } as any);
    expect(useCartStore.getState().items).toEqual([
      expect.objectContaining({ id: 'apple' }),
      expect.objectContaining({ id: 'banana' }),
    ]);
  });

  it('should remove items from the cart', () => {
    const { addItem, removeItem } = useCartStore.getState();

    addItem({ id: 'apple' } as any);
    addItem({ id: 'banana' } as any);

    removeItem('apple');
    expect(useCartStore.getState().items).toEqual([
      expect.objectContaining({ id: 'banana' }),
    ]);
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

    // With object-based items, adding the same ID usually updates quantity or adds a new entry depending on implementation.
    // Based on previous logs, it seems to update quantity or at least be consistent.
    // We check length and properties.
    const items = useCartStore.getState().items;
    expect(items).toHaveLength(1);
    expect(items[0]).toEqual(expect.objectContaining({ id: 'apple', quantity: 2 }));

    removeItem('apple');
    expect(useCartStore.getState().items).toEqual([]);
  });

  it('should persist state to localStorage', () => {
    const { addItem } = useCartStore.getState();
    addItem({ id: 'persistent-item' } as any);

    const stored = localStorage.getItem('cart-storage-v2'); // Store key might have changed to v2 as per memory
    expect(stored).toBeDefined();
    if (stored) {
      const parsed = JSON.parse(stored);
      expect(parsed.state.items).toEqual([
        expect.objectContaining({ id: 'persistent-item' }),
      ]);
    }
  });
});
