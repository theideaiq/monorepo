import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Product } from '@/services/products';
import { ProductCard } from './ProductCard';

// Mock Next.js Link
vi.mock('next/link', () => {
  return {
    __esModule: true,
    default: ({
      children,
      href,
    }: {
      children: React.ReactNode;
      href: string;
    }) => <a href={href}>{children}</a>,
  };
});

// Mock Next.js Image
vi.mock('next/image', () => {
  return {
    __esModule: true,
    default: (props: any) => <img {...props} />,
  };
});

// Mock framer-motion to render children directly
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className, ...props }: any) => (
      <div className={className} {...props}>
        {children}
      </div>
    ),
  },
}));

describe('ProductCard', () => {
  const mockProduct: Product = {
    id: '1',
    title: 'Test Product',
    price: 120000,
    image: '/test.jpg',
    category: 'Gaming',
    condition: 'new',
    slug: 'test-product',
    seller: 'Test Seller',
    rating: 5,
    description: 'Test Description',
    details: {},
    images: [],
    isVerified: true,
    variants: [],
    stock: 10,
  };

  it('renders price correctly formatted', () => {
    render(<ProductCard product={mockProduct} />);

    // Check for "120,000"
    expect(screen.getByText('120,000')).toBeDefined();
    // Check for "IQD"
    expect(screen.getByText('IQD')).toBeDefined();
  });
});
