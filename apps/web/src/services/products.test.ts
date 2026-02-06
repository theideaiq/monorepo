import { describe, expect, it } from 'vitest';
import { mapDBProductToUI } from './products';

// Mock DBProduct type (partially, casting as needed for tests)
const mockDBProduct = {
  id: 'prod_123',
  name: 'Test Product',
  description: 'A great product',
  price: 100,
  image_url: 'http://example.com/img.jpg',
  type: 'sale',
  category: 'Electronics',
  stock_count: 10,
  rental_tier: null,
  created_at: '2023-01-01T00:00:00Z',
  updated_at: '2023-01-01T00:00:00Z',
  details: { weight: '1kg' },
  condition: 'new',
  seller: 'Test Seller',
  is_verified: true,
  slug: 'test-product',
  images: ['http://example.com/img.jpg', 'http://example.com/img2.jpg'],
  reviews: [],
  product_variants: [],
};

describe('mapDBProductToUI', () => {
  it('should correctly map all basic fields', () => {
    // biome-ignore lint/suspicious/noExplicitAny: mocking DB type
    const result = mapDBProductToUI(mockDBProduct as any);

    expect(result).toEqual({
      id: 'prod_123',
      title: 'Test Product',
      slug: 'test-product',
      price: 100,
      category: 'Electronics',
      condition: 'new',
      seller: 'Test Seller',
      rating: 0,
      image: 'http://example.com/img.jpg',
      images: ['http://example.com/img.jpg', 'http://example.com/img2.jpg'],
      isVerified: true,
      description: 'A great product',
      details: { weight: '1kg' },
      variants: [],
      stock: 10,
    });
  });

  it('should calculate average rating from reviews', () => {
    const productWithReviews = {
      ...mockDBProduct,
      reviews: [{ rating: 5 }, { rating: 3 }, { rating: 4 }],
    };

    // biome-ignore lint/suspicious/noExplicitAny: mocking DB type
    const result = mapDBProductToUI(productWithReviews as any);

    expect(result.rating).toBe(4.0);
  });

  it('should handle zero reviews correctly', () => {
    const productNoReviews = {
      ...mockDBProduct,
      reviews: [],
    };
    // biome-ignore lint/suspicious/noExplicitAny: mocking DB type
    const result = mapDBProductToUI(productNoReviews as any);
    expect(result.rating).toBe(0);
  });

  it('should handle missing reviews array (undefined)', () => {
    const productUndefinedReviews = {
      ...mockDBProduct,
      reviews: undefined,
    };
    // biome-ignore lint/suspicious/noExplicitAny: mocking DB type
    const result = mapDBProductToUI(productUndefinedReviews as any);
    expect(result.rating).toBe(0);
  });

  it('should fallback to ID if slug is missing', () => {
    const productNoSlug = {
      ...mockDBProduct,
      slug: null,
    };
    // biome-ignore lint/suspicious/noExplicitAny: mocking DB type
    const result = mapDBProductToUI(productNoSlug as any);
    expect(result.slug).toBe('prod_123');
  });

  it('should map product variants correctly', () => {
    const productWithVariants = {
      ...mockDBProduct,
      product_variants: [
        {
          id: 'var_1',
          product_id: 'prod_123',
          sku: 'SKU-1',
          stock_count: 5,
          price_override: 120,
          attributes: { color: 'red' },
          image_url: 'http://example.com/red.jpg',
        },
        {
          id: 'var_2',
          product_id: 'prod_123',
          sku: 'SKU-2',
          stock_count: 0,
          price_override: null, // should use base price
          attributes: { color: 'blue' },
          image_url: null, // should use base image
        },
      ],
    };

    // biome-ignore lint/suspicious/noExplicitAny: mocking DB type
    const result = mapDBProductToUI(productWithVariants as any);

    expect(result.variants).toHaveLength(2);
    expect(result.variants[0]).toEqual({
      id: 'var_1',
      sku: 'SKU-1',
      price: 120,
      stock: 5,
      attributes: { color: 'red' },
      image: 'http://example.com/red.jpg',
    });
    expect(result.variants[1]).toEqual({
      id: 'var_2',
      sku: 'SKU-2',
      price: 100, // fallback to base price
      stock: 0,
      attributes: { color: 'blue' },
      image: 'http://example.com/img.jpg', // fallback to base image
    });
  });
});
