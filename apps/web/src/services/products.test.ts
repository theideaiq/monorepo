import { describe, expect, it } from 'vitest';
import { mapDBProductToUI } from './products';

describe('Products Service', () => {
  describe('mapDBProductToUI', () => {
    it('should correctly map reviewCount', () => {
      const mockDBProduct = {
        id: '123',
        name: 'Test Product',
        slug: 'test-product',
        price: 100,
        category: 'Test',
        condition: 'new',
        seller: 'Test Seller',
        image_url: 'test.jpg',
        images: [],
        is_verified: true,
        description: 'Test Description',
        details: {},
        stock_count: 10,
        reviews: [{ rating: 5 }, { rating: 4 }, { rating: 5 }],
        product_variants: [],
      };

      // @ts-expect-error - mock data doesn't need to match full DB schema perfectly for this test
      const result = mapDBProductToUI(mockDBProduct);

      expect(result.reviewCount).toBe(3);
      expect(result.rating).toBeCloseTo(4.7, 1); // (5+4+5)/3 = 4.666...
    });

    it('should handle zero reviews', () => {
      const mockDBProduct = {
        id: '123',
        name: 'Test Product',
        slug: 'test-product',
        price: 100,
        category: 'Test',
        condition: 'new',
        seller: 'Test Seller',
        image_url: 'test.jpg',
        images: [],
        is_verified: true,
        description: 'Test Description',
        details: {},
        stock_count: 10,
        reviews: [],
        product_variants: [],
      };

      // @ts-expect-error
      const result = mapDBProductToUI(mockDBProduct);

      expect(result.reviewCount).toBe(0);
      expect(result.rating).toBe(0);
    });
  });
});
