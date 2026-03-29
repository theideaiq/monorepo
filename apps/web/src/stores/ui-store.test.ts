import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { useUIStore } from './ui-store';

describe('UI Store', () => {
  beforeEach(() => {
    useUIStore.setState({ isCartOpen: false });
  });

  it('should start with cart closed', () => {
    expect(useUIStore.getState().isCartOpen).toBe(false);
  });

  it('should open cart', () => {
    useUIStore.getState().openCart();
    expect(useUIStore.getState().isCartOpen).toBe(true);
  });

  it('should close cart', () => {
    useUIStore.setState({ isCartOpen: true });
    useUIStore.getState().closeCart();
    expect(useUIStore.getState().isCartOpen).toBe(false);
  });

  it('should toggle cart state', () => {
    const { toggleCart } = useUIStore.getState();
    toggleCart();
    expect(useUIStore.getState().isCartOpen).toBe(true);
    toggleCart();
    expect(useUIStore.getState().isCartOpen).toBe(false);
  });
});
