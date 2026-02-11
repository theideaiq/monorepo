import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Product } from '@/services/products';
import { ProductCard } from './ProductCard';

// Mock Next.js Link
vi.mock('next/link', () => ({
  default: ({
    children,
    href,
    className,
  }: {
    children: React.ReactNode;
    href: string;
    className?: string;
  }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

// Mock Next.js Image
vi.mock('next/image', () => ({
  default: (props: any) => <img {...props} alt={props.alt} />,
}));

const mockProduct: Product = {
  id: '1',
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
  description: 'Test Description',
  details: {},
  variants: [],
  stock: 10,
};

describe('ProductCard', () => {
  it('renders product details correctly', () => {
    render(<ProductCard product={mockProduct} />);

    expect(screen.getByText('Test Product')).toBeInTheDocument();
    expect(screen.getByText('Test Seller')).toBeInTheDocument();
    // Price formatting check (1,000)
    expect(screen.getByText('1,000')).toBeInTheDocument();
  });

  it('renders quick add button with accessible label', () => {
    render(<ProductCard product={mockProduct} />);

    const button = screen.getByRole('button', {
      name: /quick add test product to cart/i,
    });
    expect(button).toBeInTheDocument();
  });

  it('renders link to product page', () => {
    render(<ProductCard product={mockProduct} />);

    const link = screen.getByRole('link', { name: /test product/i });
    expect(link).toHaveAttribute('href', '/product/test-product');
  });
});
