import { render } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ProductJsonLd } from './ProductJsonLd';
import type { Product } from '@/services/products';

// Mock env
vi.mock('@repo/env/web', () => ({
  webEnv: {
    NEXT_PUBLIC_SITE_URL: 'https://test.com',
  },
}));

describe('ProductJsonLd', () => {
  const mockProduct: Product = {
    id: '123',
    title: 'Test Product',
    description: 'A great product',
    slug: 'test-product',
    price: 1000,
    category: 'Test',
    condition: 'new',
    seller: 'Test Seller',
    rating: 4.5,
    reviewCount: 10,
    image: 'https://test.com/image.jpg',
    images: ['https://test.com/image.jpg'],
    isVerified: true,
    details: {},
    variants: [],
    stock: 5,
  };

  it('renders valid JSON-LD', () => {
    render(<ProductJsonLd product={mockProduct} />);

    const script = document.querySelector('script[type="application/ld+json"]');
    expect(script).toBeTruthy();

    if (script) {
      const json = JSON.parse(script.innerHTML);
      expect(json['@context']).toBe('https://schema.org');
      expect(json['@type']).toBe('Product');
      expect(json.name).toBe('Test Product');
      expect(json.offers.price).toBe(1000);
      expect(json.aggregateRating.ratingValue).toBe(4.5);
      expect(json.aggregateRating.reviewCount).toBe(10);
      expect(json.offers.url).toBe('https://test.com/product/test-product');
    }
  });

  it('escapes HTML entities', () => {
    const maliciousProduct = {
        ...mockProduct,
        title: '</script><script>alert(1)</script>'
    };
    render(<ProductJsonLd product={maliciousProduct} />);

    const script = document.querySelector('script[type="application/ld+json"]');
    if (script) {
        // safeJsonLdStringify replaces < with \u003c
        expect(script.innerHTML).toContain('\\u003c/script>\\u003cscript>alert(1)\\u003c/script>');
        expect(script.innerHTML).not.toContain('</script><script>');
    }
  });
});
