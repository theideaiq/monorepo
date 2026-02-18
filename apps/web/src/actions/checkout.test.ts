import { initiateCheckout } from './checkout';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mocks
const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  from: vi.fn(),
  select: vi.fn(),
  eq: vi.fn(),
  single: vi.fn(),
  insert: vi.fn(),
  getProvider: vi.fn(),
  createCheckoutSession: vi.fn(),
  redirect: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getUser: mocks.getUser },
    from: mocks.from,
  }),
}));

vi.mock('@/lib/payment/config', () => ({
  paymentFactory: { getProvider: mocks.getProvider },
}));

vi.mock('next/navigation', () => ({
  redirect: mocks.redirect,
}));

vi.mock('@repo/utils', () => ({
  Logger: { error: vi.fn() },
}));

describe('initiateCheckout', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default User
    mocks.getUser.mockResolvedValue({
      data: { user: { id: 'user-123', email: 'test@example.com' } },
    });

    // Default Provider
    mocks.getProvider.mockReturnValue({
      name: 'test-provider',
      createCheckoutSession: mocks.createCheckoutSession,
    });
    mocks.createCheckoutSession.mockResolvedValue({
      sessionId: 'sess-123',
      provider: 'test-provider',
      url: 'http://checkout.url',
      metadata: {},
    });

    // Mock Database Chain
    mocks.from.mockImplementation((table: string) => {
      if (table === 'carts') {
        // select('user_id').eq('id', cartId).single()
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { user_id: 'user-123' }, // Default: Authorized
                error: null,
              }),
            }),
          }),
        };
      }

      if (table === 'cart_items') {
        // select('...').eq('cart_id', cartId) -> returns items
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: [
                {
                  quantity: 1,
                  products: { id: 'p1', name: 'Product 1', price: 100 },
                },
              ],
              error: null,
            }),
          }),
        };
      }
      if (table === 'orders') {
        // insert(...) -> returns error/data
        return {
          insert: vi.fn().mockResolvedValue({ error: null }),
        };
      }
      // Default fallback
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: [], error: null }),
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
        insert: vi.fn().mockResolvedValue({ error: null }),
      };
    });
  });

  it('should initiate checkout successfully when cart belongs to user', async () => {
    // Arrange
    const cartId = 'cart-123';

    // Act
    await initiateCheckout(cartId);

    // Assert
    expect(mocks.redirect).toHaveBeenCalledWith('http://checkout.url');

    // Verify that 'carts' table was queried
    expect(mocks.from).toHaveBeenCalledWith('carts');
  });

  it('should throw error when cart belongs to another user', async () => {
    // Arrange
    const cartId = 'cart-other';

    // Mock carts query to return different user_id
    mocks.from.mockImplementation((table: string) => {
      if (table === 'carts') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { user_id: 'user-456' }, // Different user
                error: null,
              }),
            }),
          }),
        };
      }
      // Keep other mocks for error checking consistency (though should throw before)
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: [], error: null }),
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
        insert: vi.fn().mockResolvedValue({ error: null }),
      };
    });

    // Act & Assert
    await expect(initiateCheckout(cartId)).rejects.toThrow(
      'Unauthorized access to cart',
    );

    // redirect should not be called
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  it('should throw error when cart does not exist', async () => {
    // Arrange
    const cartId = 'cart-nonexistent';

    // Mock carts query to return null
    mocks.from.mockImplementation((table: string) => {
      if (table === 'carts') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: { message: 'Not found' },
              }),
            }),
          }),
        };
      }
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: [], error: null }),
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
        insert: vi.fn().mockResolvedValue({ error: null }),
      };
    });

    // Act & Assert
    await expect(initiateCheckout(cartId)).rejects.toThrow(
      'Unauthorized access to cart',
    );
  });
});
