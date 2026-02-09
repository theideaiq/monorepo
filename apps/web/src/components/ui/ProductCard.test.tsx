import { fireEvent, render, screen } from '@testing-library/react';
import type { Product } from '@/services/products';
import { ProductCard } from './ProductCard';

const mockProduct: Product = {
  id: '1',
  title: 'Test Product',
  slug: 'test-product',
  price: 1000,
  category: 'Test',
  condition: 'new',
  seller: 'Test Seller',
  rating: 4.5,
  image: '/test-image.jpg',
  images: ['/test-image.jpg'],
  isVerified: true,
  description: 'Test description',
  details: {},
  variants: [],
  stock: 10,
};

describe('ProductCard', () => {
  it('renders product information correctly', () => {
    render(<ProductCard product={mockProduct} />);

    expect(screen.getByText('Test Product')).toBeInTheDocument();
    expect(screen.getByText('Test Seller')).toBeInTheDocument();
    expect(screen.getByText('1,000')).toBeInTheDocument();
  });

  it('renders the add to cart button', () => {
    const onAddToCart = vi.fn();
    render(<ProductCard product={mockProduct} onAddToCart={onAddToCart} />);

    const button = screen.getByRole('button', { name: /add to cart/i });
    expect(button).toBeInTheDocument();

    fireEvent.click(button);
    expect(onAddToCart).toHaveBeenCalled();
  });

  it('contains a link to the product page', () => {
    render(<ProductCard product={mockProduct} />);

    // Check if there is a link with the correct href
    const links = screen.getAllByRole('link');
    const productLink = links.find(
      (link) => link.getAttribute('href') === '/product/test-product',
    );
    expect(productLink).toBeInTheDocument();
  });
});
