import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ProductCard } from './ProductCard';
import type { Product } from '@/services/products';

// Mock dependencies
// next/image mock to avoid errors
vi.mock('next/image', () => ({
  default: ({ src, alt, priority, fill, ...props }: any) => {
     // eslint-disable-next-line @next/next/no-img-element
     return <img src={src} alt={alt} {...props} />;
  },
}));

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, whileHover, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

const mockProduct: Product = {
  id: '1',
  title: 'Test Product',
  price: 50000,
  description: 'Test Description',
  slug: 'test-product',
  image: 'https://example.com/image.jpg',
  images: ['https://example.com/image.jpg'],
  category: 'Gaming',
  rating: 4.5,
  seller: 'Test Seller',
  condition: 'new',
  stock: 10,
  isVerified: true,
  details: {},
  variants: [],
};

describe('ProductCard', () => {
  it('renders product details correctly', () => {
    render(<ProductCard product={mockProduct} />);

    expect(screen.getByText('Test Product')).toBeDefined();
    expect(screen.getByText('Test Seller')).toBeDefined();
    expect(screen.getByText('NEW')).toBeDefined();
  });

  it('formats price correctly using formatPrice utility', () => {
    render(<ProductCard product={mockProduct} />);

    // 50,000 IQD should be formatted as "50,000"
    expect(screen.getByText('50,000')).toBeDefined();
    expect(screen.getByText('IQD')).toBeDefined();
  });
});
