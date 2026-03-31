import { beforeEach, describe, expect, it } from 'vitest';
import { useUIStore } from './ui-store';

describe('UI Store', () => {
  // Reset store before each test to ensure isolation
  beforeEach(() => {
    useUIStore.setState({ isCartOpen: false });
  });

  it('should start with the cart closed', () => {
    const { isCartOpen } = useUIStore.getState();
    expect(isCartOpen).toBe(false);
  });

  it('should open the cart when openCart is called', () => {
    const { openCart } = useUIStore.getState();

    openCart();

    expect(useUIStore.getState().isCartOpen).toBe(true);
  });

  it('should close the cart when closeCart is called', () => {
    const store = useUIStore.getState();
    store.openCart(); // Open it first
    expect(useUIStore.getState().isCartOpen).toBe(true);

    useUIStore.getState().closeCart();

    expect(useUIStore.getState().isCartOpen).toBe(false);
  });

  it('should toggle the cart state when toggleCart is called', () => {
    const { toggleCart } = useUIStore.getState();

    // Initial state is false
    expect(useUIStore.getState().isCartOpen).toBe(false);

    toggleCart(); // Should become true
    expect(useUIStore.getState().isCartOpen).toBe(true);

    toggleCart(); // Should become false
    expect(useUIStore.getState().isCartOpen).toBe(false);
  });
});
