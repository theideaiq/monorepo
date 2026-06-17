import { initiateCheckout } from './checkout';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mocks
const mocks = vi.hoisted(() => {
  return {
    getUser: vi.fn(),
    from: vi.fn(),
    getProvider: vi.fn(),
    createCheckoutSession: vi.fn(),
  };
});

// Mock dependencies
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getUser: mocks.getUser },
    from: mocks.from,
  }),
}));

vi.mock('@/lib/payment/config', () => ({
  paymentFactory: {
    getProvider: mocks.getProvider,
  },
}));

vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}));

describe('initiateCheckout', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default User
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'user-123', email: 'test@example.com' } } });

    // Mock Payment Provider
    mocks.getProvider.mockReturnValue({
      createCheckoutSession: mocks.createCheckoutSession,
      name: 'test-provider',
    });
    mocks.createCheckoutSession.mockResolvedValue({
      sessionId: 'sess_123',
      provider: 'test-provider',
      url: 'https://checkout.url',
      metadata: {},
    });
  });

  it('should throw error if user is not authenticated', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null } });
    await expect(initiateCheckout('cart-123')).rejects.toThrow('User not authenticated');
  });

  it('should throw error if cart does not belong to user', async () => {
    const cartId = 'cart-other-user';
    const userId = 'user-123';
    const otherUserId = 'user-456';

    mocks.getUser.mockResolvedValue({ data: { user: { id: userId } } });

    // Mock DB responses
    mocks.from.mockImplementation((table: string) => {
      if (table === 'carts') {
        return {
          select: () => ({
            eq: () => ({
              single: vi.fn().mockResolvedValue({
                 data: { user_id: otherUserId }, // Different user!
                 error: null
              }),
            }),
          }),
        };
      }
      if (table === 'cart_items') {
        return {
          select: () => ({
            eq: vi.fn().mockResolvedValue({
              data: [{ quantity: 1, products: { price: 100, name: 'Test Product' } }],
              error: null
            }),
          }),
        };
      }
      if (table === 'orders') {
        return {
          insert: vi.fn().mockResolvedValue({ error: null }),
        };
      }
      return {};
    });

    // This checks for our specific new security exception
    await expect(initiateCheckout(cartId)).rejects.toThrow('Unauthorized access to cart');
  });

  it('should proceed if cart belongs to user', async () => {
    const cartId = 'cart-owned';
    const userId = 'user-123';

    mocks.getUser.mockResolvedValue({ data: { user: { id: userId, email: 'test@example.com' } } });

    mocks.from.mockImplementation((table: string) => {
      if (table === 'carts') {
        return {
          select: () => ({
            eq: () => ({
              single: vi.fn().mockResolvedValue({
                 data: { user_id: userId }, // Same user
                 error: null
              }),
            }),
          }),
        };
      }
      if (table === 'cart_items') {
        return {
          select: () => ({
            eq: vi.fn().mockResolvedValue({
              data: [{ quantity: 1, products: { price: 100, name: 'Test Product' } }],
              error: null
            }),
          }),
        };
      }
      if (table === 'orders') {
        return {
          insert: vi.fn().mockResolvedValue({ error: null }),
        };
      }
      return {};
    });

    // Should not throw
    await initiateCheckout(cartId);
    // And should create session
    expect(mocks.createCheckoutSession).toHaveBeenCalled();
  });
});
