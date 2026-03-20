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

    addItem('apple');
    expect(useCartStore.getState().items).toEqual(['apple']);

    addItem('banana');
    expect(useCartStore.getState().items).toEqual(['apple', 'banana']);
  });

  it('should remove items from the cart', () => {
    const { addItem, removeItem } = useCartStore.getState();

    addItem('apple');
    addItem('banana');

    removeItem('apple');
    expect(useCartStore.getState().items).toEqual(['banana']);
  });

  it('should clear the cart', () => {
    const { addItem, clearCart } = useCartStore.getState();

    addItem('apple');
    addItem('banana');

    clearCart();
    expect(useCartStore.getState().items).toEqual([]);
  });

  it('should handle duplicate items correctly (removes all instances)', () => {
    // Current behavior documentation: removing an item removes ALL instances of that value
    const { addItem, removeItem } = useCartStore.getState();

    addItem('apple');
    addItem('apple');
    expect(useCartStore.getState().items).toEqual(['apple', 'apple']);

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

  it('should update the quantity of an existing item', () => {
    const { addItem, updateQuantity } = useCartStore.getState();
    const testItem = { id: 'apple', productId: 'p1', title: 'Apple', price: 1.0, image: 'apple.png' } as any;

    // Arrange: Add a valid item object so its quantity is 1
    addItem(testItem);

    // Act: Update quantity to 5
    updateQuantity('apple', 5);

    // Assert: The quantity of the specific item should be updated to 5
    const updatedItems = useCartStore.getState().items;
    expect(updatedItems).toHaveLength(1);
    expect(updatedItems[0].quantity).toBe(5);
  });
});
