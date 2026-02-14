import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Product } from '@/services/products';
import { ProductCard } from './ProductCard';

// Mock next/image
vi.mock('next/image', () => ({
  // biome-ignore lint/suspicious/noExplicitAny: Mock component props
  default: ({ src, alt, ...props }: any) => {
    // biome-ignore lint/performance/noImgElement: Mock component
    return <img src={src} alt={alt} {...props} />;
  },
}));

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    // biome-ignore lint/suspicious/noExplicitAny: Mock component props
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

describe('ProductCard', () => {
  const mockProduct: Product = {
    id: 'test-1',
    title: 'Test Product',
    slug: 'test-product',
    price: 1000,
    category: 'Electronics',
    condition: 'new',
    seller: 'Test Seller',
    rating: 4.5,
    image: '/test-image.jpg',
    images: ['/test-image.jpg'],
    isVerified: true,
    description: 'A test product description',
    details: {},
    variants: [],
    stock: 10,
  };

  it('renders product information correctly', () => {
    render(<ProductCard product={mockProduct} />);

    expect(screen.getByText('Test Product')).toBeInTheDocument();
    expect(screen.getByText('Test Seller')).toBeInTheDocument();
    // Price formatting might depend on locale, but let's check basic presence
    expect(screen.getByText('1,000')).toBeInTheDocument();
    expect(screen.getByText('NEW')).toBeInTheDocument();
  });

  it('renders the Quick Add button with correct aria-label', () => {
    render(<ProductCard product={mockProduct} />);

    const button = screen.getByRole('button', {
      name: `Add ${mockProduct.title} to cart`,
    });
    expect(button).toBeInTheDocument();
  });
});
