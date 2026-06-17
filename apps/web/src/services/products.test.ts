// @vitest-environment node
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { getProducts } from './products';
import { Logger } from '@repo/utils';

// Mock Logger
vi.mock('@repo/utils', () => ({
  Logger: {
    error: vi.fn(),
  },
}));

// Mock Supabase Client Chain
const mockLimit = vi.fn();
const mockGt = vi.fn();
const mockSelect = vi.fn();
const mockFrom = vi.fn();

const mockSupabase = {
  from: mockFrom,
};

// Setup chain behavior
mockFrom.mockReturnValue({ select: mockSelect });
mockSelect.mockReturnValue({ gt: mockGt });
mockGt.mockReturnValue({ limit: mockLimit });

// Spy on createClient
vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => mockSupabase),
}));

describe('getProducts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default chain setup for each test if needed, but handled by mocks above
    mockFrom.mockReturnValue({ select: mockSelect });
    mockSelect.mockReturnValue({ gt: mockGt });
    mockGt.mockReturnValue({ limit: mockLimit });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return mapped products when Supabase returns valid data', async () => {
    const mockData = [
      {
        id: 'prod_1',
        name: 'Test Product',
        slug: 'test-product',
        price: 100,
        category: 'Test Category',
        condition: 'new',
        seller: 'Test Seller',
        image_url: 'http://example.com/image.jpg',
        images: ['http://example.com/image.jpg'],
        is_verified: true,
        description: 'Test Description',
        details: { key: 'value' },
        stock_count: 10,
        reviews: [{ rating: 5 }, { rating: 3 }],
        product_variants: [
          {
            id: 'var_1',
            sku: 'SKU1',
            price_override: 120,
            stock_count: 5,
            attributes: { color: 'red' },
            image_url: 'http://example.com/var1.jpg',
          },
        ],
      },
    ];

    mockLimit.mockResolvedValue({ data: mockData, error: null });

    const products = await getProducts();

    expect(products).toHaveLength(1);
    const product = products[0];

    expect(product.id).toBe('prod_1');
    expect(product.title).toBe('Test Product');
    expect(product.rating).toBe(4); // (5+3)/2
    expect(product.variants).toHaveLength(1);
    expect(product.variants[0].price).toBe(120);
    expect(product.variants[0].attributes).toEqual({ color: 'red' });
  });

  it('should return empty array and log error when Supabase returns an error', async () => {
    const mockError = { message: 'Supabase error' };
    mockLimit.mockResolvedValue({ data: null, error: mockError });

    const products = await getProducts();

    expect(products).toEqual([]);
    expect(Logger.error).toHaveBeenCalledWith('Error fetching products:', mockError);
  });

  it('should return fallback data and log unexpected error when an exception is thrown', async () => {
    const mockError = new Error('Network error');
    mockLimit.mockRejectedValue(mockError);

    const products = await getProducts();

    // Fallback data is hardcoded in the service, check length > 0
    expect(products.length).toBeGreaterThan(0);
    expect(products[0].id).toBeDefined();
    expect(Logger.error).toHaveBeenCalledWith('Unexpected error fetching products:', mockError);
  });
});
