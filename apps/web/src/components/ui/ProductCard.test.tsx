import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Product } from '@/services/products';
import { ProductCard } from './ProductCard';

// Mock next/image
vi.mock('next/image', () => ({
  default: ({ src, alt, fill, priority, ...props }: any) => {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt} {...props} />;
  },
}));

// Mock framer-motion to render children directly
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, whileHover, ...props }: any) => (
      <div {...props}>{children}</div>
    ),
  },
}));

const mockProduct: Product = {
  id: '1',
  title: 'Test Product',
  slug: 'test-product',
  price: 1000,
  category: 'Test Category',
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
  it('renders product information correctly', () => {
    render(<ProductCard product={mockProduct} />);

    expect(screen.getByText('Test Product')).toBeInTheDocument();
    expect(screen.getByText('Test Seller')).toBeInTheDocument();
    expect(screen.getByText('1,000')).toBeInTheDocument(); // Formatted price
    expect(screen.getByText('IQD')).toBeInTheDocument();
  });

  it('renders the main link with correct href and label', () => {
    render(<ProductCard product={mockProduct} />);

    const link = screen.getByRole('link', { name: /view test product/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/product/test-product');
  });

  it('renders the "Add to cart" button with accessible label', () => {
    const onAddToCart = vi.fn();
    render(<ProductCard product={mockProduct} onAddToCart={onAddToCart} />);

    const button = screen.getByRole('button', { name: /add to cart/i });
    expect(button).toBeInTheDocument();

    // Simulate click
    fireEvent.click(button);
    expect(onAddToCart).toHaveBeenCalledTimes(1);
  });

  it('renders rating with accessible label', () => {
    render(<ProductCard product={mockProduct} />);

    // Check for the accessible text "Rating: 4.5 out of 5"
    // Note: In the component code: aria-label={`Rating: ${product.rating} out of 5`} on the container div
    // We can query by role="img" (since we added role="img")
    const ratingElement = screen.getByRole('img', {
      name: /rating: 4.5 out of 5/i,
    });
    expect(ratingElement).toBeInTheDocument();
  });

  it('does not nest interactive elements (link inside link)', () => {
    const { container } = render(<ProductCard product={mockProduct} />);

    // Ensure there are no nested anchors
    const links = container.querySelectorAll('a');
    links.forEach((link) => {
      expect(link.querySelector('a')).toBeNull();
      expect(link.querySelector('button')).toBeNull();
    });
  });
});
