import { describe, expect, it, vi, beforeEach } from 'vitest';
import { initiateCheckout } from './checkout';

const mocks = vi.hoisted(() => {
  return {
    getUser: vi.fn(),
    from: vi.fn(),
    select: vi.fn(),
    eq: vi.fn(),
    single: vi.fn(),
    insert: vi.fn(),
    redirect: vi.fn(),
    createCheckoutSession: vi.fn(),
    getProvider: vi.fn(),
  };
});

// Mock Supabase
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getUser: mocks.getUser },
    from: mocks.from,
  }),
}));

// Mock Payment Factory
vi.mock('@/lib/payment/config', () => ({
  paymentFactory: {
    getProvider: mocks.getProvider,
  },
}));

// Mock Next Navigation
vi.mock('next/navigation', () => ({
  redirect: mocks.redirect,
}));

// Mock Logger
vi.mock('@repo/utils', () => ({
  Logger: {
    error: vi.fn(),
  },
}));

describe('initiateCheckout', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default user
    mocks.getUser.mockResolvedValue({
      data: { user: { id: 'user-123', email: 'test@example.com' } },
    });

    // Default provider behavior
    mocks.getProvider.mockReturnValue({
      name: 'wayl',
      createCheckoutSession: mocks.createCheckoutSession,
    });
  });

  it('should throw error if cart does not belong to user (IDOR prevention)', async () => {
    const cartId = 'cart-other-user';

    // Setup mocks specifically for this test
    mocks.from.mockImplementation((table) => {
      if (table === 'carts') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } })
              })
            })
          })
        };
      }
      return { select: vi.fn() };
    });

    await expect(initiateCheckout(cartId)).rejects.toThrow('Unauthorized access to cart');
  });

  it('should redirect to payment url when cart is valid', async () => {
    const cartId = 'cart-123';
    const paymentUrl = 'https://payment.provider/checkout/session-123';

    mocks.createCheckoutSession.mockResolvedValue({
      sessionId: 'session-123',
      url: paymentUrl,
      provider: 'wayl',
      metadata: {},
    });

    // Setup mocks for happy path
    mocks.from.mockImplementation((table) => {
      if (table === 'carts') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                single: vi.fn().mockResolvedValue({ data: { id: cartId }, error: null })
              })
            })
          })
        };
      }
      if (table === 'cart_items') {
        return {
          select: () => ({
            eq: vi.fn().mockResolvedValue({
              data: [
                { quantity: 2, products: { id: 'prod-1', name: 'Test Product', price: 1000 } }
              ],
              error: null
            })
          })
        };
      }
      if (table === 'orders') {
        return {
          insert: vi.fn().mockResolvedValue({ error: null })
        };
      }
      return {};
    });

    await initiateCheckout(cartId);

    // Verify correct calls
    expect(mocks.redirect).toHaveBeenCalledWith(paymentUrl);
    expect(mocks.createCheckoutSession).toHaveBeenCalledWith(expect.objectContaining({
      amount: 2000, // 2 * 1000
    }));
  });
});
