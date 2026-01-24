import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getProducts, getProductBySlug } from './products';

// Mock data
const mockDBProducts = [
  {
    id: 'p1',
    name: 'Test Product 1',
    description: 'Desc 1',
    price: 1000,
    image_url: 'img1.jpg',
    category: 'Test',
    condition: 'new',
    seller: 'Seller 1',
    is_verified: true,
    slug: 'test-product-1',
    stock_count: 5,
    details: {},
    images: ['img1.jpg'],
    reviews: [{ rating: 5 }, { rating: 4 }],
    product_variants: [],
    created_at: '2023-01-01', // Required by DB type
    updated_at: '2023-01-01',
    type: 'sale',
    rental_tier: null,
  },
];

const mockDBProduct = mockDBProducts[0];

// Mock Supabase Client
const mockLimit = vi.fn();
const mockGt = vi.fn().mockReturnValue({ limit: mockLimit });
const mockSingle = vi.fn();
const mockEq = vi.fn().mockReturnValue({ single: mockSingle });
const mockSelect = vi.fn().mockReturnValue({
  gt: mockGt,
  eq: mockEq,
});
const mockFrom = vi.fn().mockReturnValue({ select: mockSelect });

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    from: mockFrom,
  }),
}));

describe('Products Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getProducts', () => {
    it('should return mapped products when supabase returns data', async () => {
      // Arrange
      mockLimit.mockResolvedValue({ data: mockDBProducts, error: null });

      // Act
      const result = await getProducts();

      // Assert
      expect(mockFrom).toHaveBeenCalledWith('products');
      expect(mockSelect).toHaveBeenCalledWith('*, reviews(rating)');
      expect(mockGt).toHaveBeenCalledWith('stock_count', 0);
      expect(mockLimit).toHaveBeenCalledWith(20);

      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Test Product 1');
      expect(result[0].rating).toBe(4.5); // (5+4)/2
    });

    it('should return empty list when supabase returns handled error', async () => {
      // Arrange
      mockLimit.mockResolvedValue({ data: null, error: { message: 'Error' } });

      // Act
      const result = await getProducts();

      // Assert
      expect(result).toEqual([]);
    });

    it('should return fallback data when unexpected error occurs', async () => {
      // Arrange
      mockLimit.mockRejectedValue(new Error('Unexpected crash'));

      // Act
      const result = await getProducts();

      // Assert
      // The catch block returns a hardcoded fallback list of 2 items
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('1');
    });
  });

  describe('getProductBySlug', () => {
    it('should return mapped product when found', async () => {
      // Arrange
      mockSingle.mockResolvedValue({ data: mockDBProduct, error: null });

      // Act
      const result = await getProductBySlug('test-product-1');

      // Assert
      expect(mockEq).toHaveBeenCalledWith('slug', 'test-product-1');
      expect(mockSingle).toHaveBeenCalled();

      expect(result).not.toBeNull();
      expect(result?.title).toBe('Test Product 1');
    });

    it('should return null when supabase returns handled error', async () => {
      // Arrange
      mockSingle.mockResolvedValue({ data: null, error: { message: 'Not found' } });

      // Act
      const result = await getProductBySlug('unknown-slug');

      // Assert
      expect(result).toBeNull();
    });

    it('should return fallback data when unexpected error occurs', async () => {
      // Arrange
      mockSingle.mockRejectedValue(new Error('Unexpected crash'));

      // Act
      const result = await getProductBySlug('unknown-slug');

      // Assert
      // The catch block returns a fallback product object using the slug
      expect(result).not.toBeNull();
      expect(result?.slug).toBe('unknown-slug');
    });
  });
});
