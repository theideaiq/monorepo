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

    const apple = { id: 'apple', productId: 'p1', title: 'Apple', price: 1, image: '' };
    addItem(apple);
    expect(useCartStore.getState().items).toEqual([{ ...apple, quantity: 1 }]);

    const banana = { id: 'banana', productId: 'p2', title: 'Banana', price: 2, image: '' };
    addItem(banana);
    expect(useCartStore.getState().items).toEqual([{ ...apple, quantity: 1 }, { ...banana, quantity: 1 }]);
  });

  it('should remove items from the cart', () => {
    const { addItem, removeItem } = useCartStore.getState();

    const apple = { id: 'apple', productId: 'p1', title: 'Apple', price: 1, image: '' };
    const banana = { id: 'banana', productId: 'p2', title: 'Banana', price: 2, image: '' };
    addItem(apple);
    addItem(banana);

    removeItem('apple');
    expect(useCartStore.getState().items).toEqual([{ ...banana, quantity: 1 }]);
  });

  it('should clear the cart', () => {
    const { addItem, clearCart } = useCartStore.getState();

    const apple = { id: 'apple', productId: 'p1', title: 'Apple', price: 1, image: '' };
    const banana = { id: 'banana', productId: 'p2', title: 'Banana', price: 2, image: '' };
    addItem(apple);
    addItem(banana);

    clearCart();
    expect(useCartStore.getState().items).toEqual([]);
  });

  it('should handle duplicate items correctly (increases quantity)', () => {
    const { addItem, removeItem } = useCartStore.getState();

    const apple = { id: 'apple', productId: 'p1', title: 'Apple', price: 1, image: '' };
    addItem(apple);
    addItem(apple);
    expect(useCartStore.getState().items).toEqual([{ ...apple, quantity: 2 }]);

    removeItem('apple');
    expect(useCartStore.getState().items).toEqual([]);
  });

  it('should persist state to localStorage', () => {
    const { addItem } = useCartStore.getState();
    const item = { id: 'persistent-item', productId: 'p3', title: 'Item', price: 10, image: '' };
    addItem(item);

    const stored = localStorage.getItem('cart-storage-v2');
    expect(stored).toBeDefined();
    if (stored) {
      const parsed = JSON.parse(stored);
      expect(parsed.state.items).toEqual([{ ...item, quantity: 1 }]);
    }
  });

  it('should correctly update quantity and recalculate total, ignoring updates < 1', () => {
    const { updateQuantity } = useCartStore.getState();

    // Arrange: Pre-populate the store with items
    const testItem = { id: 'test-item', productId: 'p1', title: 'Test', price: 10, image: '', quantity: 2 };
    const testItem2 = { id: 'test-item-2', productId: 'p2', title: 'Test 2', price: 15, image: '', quantity: 1 };
    useCartStore.setState({
      items: [testItem, testItem2],
      total: 35 // (10 * 2) + (15 * 1)
    });

    // Act: Update quantity of first item to 5
    updateQuantity('test-item', 5);

    // Assert: Quantity updated and total recalculated properly
    expect(useCartStore.getState().items[0].quantity).toBe(5);
    expect(useCartStore.getState().total).toBe(65); // (10 * 5) + (15 * 1)

    // Act: Attempt to update quantity to < 1 (Boundary Analysis)
    updateQuantity('test-item', 0);
    updateQuantity('test-item', -5);

    // Assert: Update is ignored
    expect(useCartStore.getState().items[0].quantity).toBe(5);
    expect(useCartStore.getState().total).toBe(65);
  });
});
