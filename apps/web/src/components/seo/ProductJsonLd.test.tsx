import { render, cleanup } from '@testing-library/react';
import { describe, it, expect, afterEach } from 'vitest';
import ProductJsonLd from './ProductJsonLd';
import { Product } from '@/services/products';

describe('ProductJsonLd', () => {
  const mockProduct: Product = {
    id: '123',
    title: 'Test Product',
    slug: 'test-product',
    price: 1000,
    category: 'Electronics',
    condition: 'new',
    seller: 'Test Seller',
    rating: 4.5,
    reviewCount: 10,
    image: 'test.jpg',
    images: ['test.jpg'],
    isVerified: true,
    description: 'Test Description',
    details: {},
    variants: [],
    stock: 5,
  };

  afterEach(() => {
    cleanup();
  });

  it('renders correct JSON-LD', () => {
    render(<ProductJsonLd product={mockProduct} />);

    const script = document.querySelector('script[type="application/ld+json"]');
    expect(script).toBeTruthy();

    if (script) {
        const json = JSON.parse(script.innerHTML);
        expect(json['@type']).toBe('Product');
        expect(json.name).toBe('Test Product');
        expect(json.aggregateRating.ratingValue).toBe(4.5);
        expect(json.aggregateRating.reviewCount).toBe(10);
    }
  });

  it('omits aggregateRating if no reviews', () => {
      const productNoReviews = { ...mockProduct, rating: 0, reviewCount: 0 };
      render(<ProductJsonLd product={productNoReviews} />);

      const script = document.querySelector('script[type="application/ld+json"]');
      expect(script).toBeTruthy();
      if (script) {
          const json = JSON.parse(script.innerHTML);
          expect(json.aggregateRating).toBeUndefined();
      }
  });
});
