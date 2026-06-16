import { beforeEach, describe, expect, it, vi } from 'vitest';
import { initiateCheckout } from './checkout';

const mocks = vi.hoisted(() => {
  return {
    getUser: vi.fn(),
    select: vi.fn(),
    eq: vi.fn(),
    single: vi.fn(),
    from: vi.fn(),
    insert: vi.fn(),
    redirect: vi.fn(),
    createCheckoutSession: vi.fn(),
  };
});

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getUser: mocks.getUser },
    from: mocks.from,
  }),
}));

vi.mock('next/navigation', () => ({
  redirect: mocks.redirect,
}));

vi.mock('@repo/env/web', () => ({
  webEnv: {
    NEXT_PUBLIC_SITE_URL: 'http://localhost:3000',
    WAYL_SECRET_KEY: 'mock-key',
    WAYL_WEBHOOK_SECRET: 'mock-secret',
    ZAIN_SECRET_KEY: 'mock-zain-key',
  },
}));

vi.mock('@/lib/payment/config', () => ({
  paymentFactory: {
    getProvider: vi.fn().mockReturnValue({
      createCheckoutSession: mocks.createCheckoutSession,
      name: 'wayl',
    }),
  },
}));

describe('initiateCheckout', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Setup generic chain
    mocks.from.mockReturnValue({
      select: mocks.select,
      insert: mocks.insert,
    });
    mocks.select.mockReturnValue({
      eq: mocks.eq,
      single: mocks.single, // For the chain that ends in single()
    });
    mocks.eq.mockReturnValue({
      single: mocks.single, // For chains: select().eq().single()
      // biome-ignore lint/suspicious/noThenProperty: Mocking a Thenable for await support
      // biome-ignore lint/suspicious/noExplicitAny: Generic resolver
      then: (resolve: any) => resolve({ data: [], error: null }), // For chains that are awaited directly after eq()
    });

    // Default user
    mocks.getUser.mockResolvedValue({
      data: { user: { id: 'user-123', email: 'test@example.com' } },
    });
  });

  it('should throw error when cart belongs to another user (IDOR prevention)', async () => {
    // Arrange
    const cartId = 'cart-target';
    const userId = 'user-123';

    // Mock user
    mocks.getUser.mockResolvedValue({ data: { user: { id: userId } } });

    // Mock carts query to return a different user_id
    // This mocks the NEW query we plan to add: from('carts').select().eq().single()
    mocks.single.mockResolvedValue({
      data: { user_id: 'other-user' },
      error: null,
    });

    // We also need to mock the cart_items response so the current code *would* succeed if it weren't for our check.
    mocks.eq.mockImplementation((field, value) => {
      if (field === 'cart_id' && value === cartId) {
        return {
          // biome-ignore lint/suspicious/noThenProperty: Mocking a Thenable for await support
          // biome-ignore lint/suspicious/noExplicitAny: Generic resolver
          then: (resolve: any) =>
            resolve({
              data: [
                { quantity: 1, products: { price: 100, name: 'Test Product' } },
              ],
              error: null,
            }),
        };
      }
      // This is for the new check: eq('id', cartId) which returns an object with single()
      return {
        single: mocks.single,
      };
    });

    // Act & Assert
    await expect(initiateCheckout(cartId)).rejects.toThrow(
      'Unauthorized access to cart',
    );
  });

  it('should redirect to payment session url when cart belongs to user', async () => {
    // Arrange
    const cartId = 'cart-123';
    const userId = 'user-123';
    const sessionUrl = 'https://checkout.stripe.com/session-123';

    mocks.getUser.mockResolvedValue({
      data: { user: { id: userId, email: 'test@example.com' } },
    });

    // Mock cart ownership check
    mocks.single.mockResolvedValue({ data: { user_id: userId }, error: null });

    // Mock cart items fetch
    mocks.eq.mockImplementation((field, value) => {
      if (field === 'cart_id' && value === cartId) {
        return {
          // biome-ignore lint/suspicious/noThenProperty: Mocking a Thenable for await support
          // biome-ignore lint/suspicious/noExplicitAny: Generic resolver
          then: (resolve: any) =>
            resolve({
              data: [
                { quantity: 2, products: { price: 100, name: 'Test Product' } },
              ],
              error: null,
            }),
        };
      }
      return { single: mocks.single };
    });

    // Mock createCheckoutSession
    mocks.createCheckoutSession.mockResolvedValue({
      url: sessionUrl,
      sessionId: 'sess_123',
      provider: 'wayl',
      metadata: {},
    });

    // Mock orders insert
    mocks.insert.mockResolvedValue({ error: null });

    // Act
    await initiateCheckout(cartId);

    // Assert
    expect(mocks.redirect).toHaveBeenCalledWith(sessionUrl);
  });
});
