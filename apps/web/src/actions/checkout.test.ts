import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { initiateCheckout } from './checkout';

// Hoist mocks to be used in vi.mock
const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  from: vi.fn(),
  select: vi.fn(),
  eq: vi.fn(),
  insert: vi.fn(),
  getProvider: vi.fn(),
  createCheckoutSession: vi.fn(),
  redirect: vi.fn(),
}));

// Mock Supabase Client
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

// Mock Environment
vi.mock('@repo/env/web', () => ({
  webEnv: {
    NEXT_PUBLIC_SITE_URL: 'http://localhost:3000',
  },
}));

// Mock Navigation
vi.mock('next/navigation', () => ({
  redirect: mocks.redirect,
}));

describe('initiateCheckout', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock crypto.randomUUID
    vi.stubGlobal('crypto', { randomUUID: vi.fn().mockReturnValue('mock-uuid') });

    // Default Supabase mocks (chaining)
    mocks.from.mockImplementation((table) => {
      if (table === 'cart_items') {
        return { select: mocks.select };
      }
      if (table === 'orders') {
        return { insert: mocks.insert };
      }
      return {};
    });
    mocks.select.mockReturnValue({ eq: mocks.eq });

    // Default Payment mocks
    mocks.getProvider.mockReturnValue({
      createCheckoutSession: mocks.createCheckoutSession,
      name: 'mock-provider',
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should successfully create session and redirect (Happy Path)', async () => {
    // Arrange
    const cartId = 'cart-123';
    const userId = 'user-123';
    const mockUser = { id: userId, email: 'test@example.com' };
    const mockCartItems = [
      {
        quantity: 2,
        products: {
          id: 'prod-1',
          name: 'Test Product',
          price: 100,
          description: 'A test product',
        },
      },
    ];
    const mockSession = {
      sessionId: 'sess_123',
      provider: 'stripe',
      metadata: {},
      url: 'http://checkout.url',
    };

    mocks.getUser.mockResolvedValue({ data: { user: mockUser } });
    mocks.eq.mockResolvedValue({ data: mockCartItems, error: null });
    mocks.createCheckoutSession.mockResolvedValue(mockSession);
    mocks.insert.mockResolvedValue({ error: null });

    // Act
    await initiateCheckout(cartId);

    // Assert
    expect(mocks.getUser).toHaveBeenCalled();
    expect(mocks.from).toHaveBeenCalledWith('cart_items');
    expect(mocks.eq).toHaveBeenCalledWith('cart_id', cartId);
    expect(mocks.getProvider).toHaveBeenCalledWith(200); // 2 * 100
    expect(mocks.createCheckoutSession).toHaveBeenCalledWith(expect.objectContaining({
        amount: 200,
        customer: { email: mockUser.email },
        referenceId: 'mock-uuid',
    }));
    expect(mocks.from).toHaveBeenCalledWith('orders');
    expect(mocks.insert).toHaveBeenCalledWith(expect.objectContaining({
        user_id: userId,
        total_amount: 200,
        gateway_link_id: mockSession.sessionId,
    }));
    expect(mocks.redirect).toHaveBeenCalledWith(mockSession.url);
  });

  it('should throw error when user is not authenticated', async () => {
    // Arrange
    mocks.getUser.mockResolvedValue({ data: { user: null } });

    // Act & Assert
    await expect(initiateCheckout('cart-123')).rejects.toThrow('User not authenticated');
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it('should throw error when cart is empty', async () => {
    // Arrange
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'user-123' } } });
    mocks.eq.mockResolvedValue({ data: [], error: null });

    // Act & Assert
    await expect(initiateCheckout('cart-123')).rejects.toThrow('Cart is empty or not found');
  });

  it('should throw error when cart fetch fails', async () => {
    // Arrange
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'user-123' } } });
    mocks.eq.mockResolvedValue({ data: null, error: { message: 'DB Error' } });

    // Act & Assert
    await expect(initiateCheckout('cart-123')).rejects.toThrow('Cart is empty or not found');
  });

  it('should throw error when total is invalid (<= 0)', async () => {
    // Arrange
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'user-123' } } });
    mocks.eq.mockResolvedValue({
      data: [{ quantity: 1, products: { price: 0 } }], // Total 0
      error: null,
    });

    // Act & Assert
    await expect(initiateCheckout('cart-123')).rejects.toThrow('Invalid total amount');
  });

  it('should throw error when order creation fails', async () => {
    // Arrange
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'user-123' } } });
    mocks.eq.mockResolvedValue({
      data: [{ quantity: 1, products: { price: 100, name: 'Prod' } }],
      error: null,
    });
    mocks.createCheckoutSession.mockResolvedValue({
      sessionId: 'sess_123',
      provider: 'stripe',
      url: 'http://checkout.url',
    });
    mocks.insert.mockResolvedValue({ error: { message: 'Insert failed' } });

    // Act & Assert
    await expect(initiateCheckout('cart-123')).rejects.toThrow('Failed to create order');
    expect(mocks.redirect).not.toHaveBeenCalled();
  });
});
