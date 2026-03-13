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

  const apple = {
    id: 'apple',
    productId: 'prod_apple',
    title: 'Apple',
    price: 1.5,
    image: '/apple.jpg'
  };

  const banana = {
    id: 'banana',
    productId: 'prod_banana',
    title: 'Banana',
    price: 0.8,
    image: '/banana.jpg'
  };

  it('should start with an empty cart', () => {
    const { items, total } = useCartStore.getState();
    expect(items).toEqual([]);
    expect(total).toBe(0);
  });

  it('should add items to the cart', () => {
    const { addItem } = useCartStore.getState();

    addItem(apple);
    expect(useCartStore.getState().items).toEqual([{ ...apple, quantity: 1 }]);

    addItem(banana);
    expect(useCartStore.getState().items).toEqual([
      { ...apple, quantity: 1 },
      { ...banana, quantity: 1 }
    ]);
  });

  it('should remove items from the cart', () => {
    const { addItem, removeItem } = useCartStore.getState();

    addItem(apple);
    addItem(banana);

    removeItem('apple');
    expect(useCartStore.getState().items).toEqual([{ ...banana, quantity: 1 }]);
  });

  it('should clear the cart', () => {
    const { addItem, clearCart } = useCartStore.getState();

    addItem(apple);
    addItem(banana);

    clearCart();
    expect(useCartStore.getState().items).toEqual([]);
    expect(useCartStore.getState().total).toBe(0);
  });

  it('should handle duplicate items correctly (increases quantity)', () => {
    const { addItem } = useCartStore.getState();

    addItem(apple);
    addItem(apple);
    expect(useCartStore.getState().items).toEqual([{ ...apple, quantity: 2 }]);
  });

  it('should persist state to localStorage', () => {
    const { addItem } = useCartStore.getState();
    addItem(apple);

    const stored = localStorage.getItem('cart-storage-v2');
    expect(stored).toBeDefined();
    if (stored) {
      const parsed = JSON.parse(stored);
      expect(parsed.state.items).toEqual([{ ...apple, quantity: 1 }]);
    }
  });

  it('should calculate correct total when adding, updating, and removing items', () => {
    const { addItem, updateQuantity, removeItem } = useCartStore.getState();

    // Add items
    addItem(apple); // total: 1.5
    expect(useCartStore.getState().total).toBe(1.5);

    addItem(banana); // total: 1.5 + 0.8 = 2.3
    expect(useCartStore.getState().total).toBe(2.3);

    // Update quantity
    updateQuantity('apple', 3); // total: 3 * 1.5 + 0.8 = 5.3
    expect(useCartStore.getState().total).toBe(5.3);

    // Remove item
    removeItem('banana'); // total: 3 * 1.5 = 4.5
    expect(useCartStore.getState().total).toBe(4.5);
  });
});
