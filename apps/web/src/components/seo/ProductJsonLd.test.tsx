import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import ProductJsonLd from './ProductJsonLd';
import type { Product } from '@/services/products';

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
    images: ['test2.jpg'],
    isVerified: true,
    description: 'A test product description',
    details: {},
    variants: [],
    stock: 5,
  };

  it('renders correct JSON-LD script', () => {
    const { container } = render(
      <ProductJsonLd product={mockProduct} baseUrl="https://example.com" />
    );

    const script = container.querySelector('script[type="application/ld+json"]');
    expect(script).toBeTruthy();

    if (script) {
      const json = JSON.parse(script.innerHTML);
      expect(json['@context']).toBe('https://schema.org');
      expect(json['@type']).toBe('Product');
      expect(json.name).toBe('Test Product');
      expect(json.description).toBe('A test product description');
      expect(json.image).toEqual(['test.jpg', 'test2.jpg']);
      expect(json.sku).toBe('123');
      expect(json.brand.name).toBe('Test Seller');
      expect(json.offers.price).toBe(1000);
      expect(json.offers.priceCurrency).toBe('IQD');
      expect(json.offers.availability).toBe('https://schema.org/InStock');
      expect(json.offers.url).toBe('https://example.com/product/test-product');
      expect(json.aggregateRating.ratingValue).toBe(4.5);
      expect(json.aggregateRating.reviewCount).toBe(10);
    }
  });

  it('handles missing rating', () => {
    const productNoRating = { ...mockProduct, rating: 0, reviewCount: 0 };
    const { container } = render(
      <ProductJsonLd product={productNoRating} baseUrl="https://example.com" />
    );

    const script = container.querySelector('script');
    if (script) {
      const json = JSON.parse(script.innerHTML);
      expect(json.aggregateRating).toBeUndefined();
    }
  });
});
