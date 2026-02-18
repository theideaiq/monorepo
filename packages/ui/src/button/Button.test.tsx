import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Button } from './Button';

describe('Button', () => {
  it('renders correctly', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('handles click events', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    fireEvent.click(screen.getByText('Click me'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('shows loader when loading', () => {
    render(<Button isLoading>Click me</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('applies variant classes', () => {
    const { container } = render(
      <Button variant="secondary">Secondary</Button>,
    );
    expect(container.firstChild).toHaveClass('bg-brand-yellow');
  });

  it('keeps accessible content when loading', () => {
    render(<Button isLoading>Submit Order</Button>);

    // Content should still be in the DOM for screen readers
    const buttonContent = screen.getByText('Submit Order');
    expect(buttonContent).toBeInTheDocument();

    // Button should be marked as busy
    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-busy', 'true');
  });
});
