import { render, screen } from '@testing-library/react';
import { ProductCard } from './ProductCard';
import { vi } from 'vitest';

// Mock Next.js Image
vi.mock('next/image', () => ({
  default: ({ src, alt, fill, priority, ...props }: any) => {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt} {...props} />;
  },
}));

// Mock Next.js Link
vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

// Mock Framer Motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, whileHover, ...props }: any) => (
      <div {...props}>{children}</div>
    ),
  },
}));

const mockProduct = {
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
  it('renders correctly and has accessible Add to Cart button', () => {
    render(<ProductCard product={mockProduct} />);

    // Check if product title is rendered
    expect(screen.getByText('Test Product')).toBeInTheDocument();

    // Check if price is formatted correctly (1,000 IQD)
    expect(screen.getByText('1,000')).toBeInTheDocument();

    // Check for the Add to Cart button with improved aria-label
    const button = screen.getByRole('button', { name: /add test product to cart/i });
    expect(button).toBeInTheDocument();

    // Check initial classes for hidden state
    expect(button).toHaveClass('translate-y-12');
    expect(button).toHaveClass('opacity-0');

    // Check for focus-visible classes (Accessibility Improvement)
    expect(button).toHaveClass('focus-visible:translate-y-0');
    expect(button).toHaveClass('focus-visible:opacity-100');
    expect(button).toHaveClass('focus-visible:ring-2');
    expect(button).toHaveClass('focus-visible:ring-brand-yellow');
  });
});
