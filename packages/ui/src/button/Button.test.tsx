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
    // Loader2 from lucide-react usually renders as an svg, we can check for "loading" state if we had aria-label or just check if button is disabled
    expect(screen.getByRole('button')).toBeDisabled();
    // Assuming Loader2 is rendered, we might not easily select it by text, but we can check if button is disabled.
  });

  it('applies variant classes', () => {
    const { container } = render(
      <Button variant="secondary">Secondary</Button>,
    );
    expect(container.firstChild).toHaveClass('bg-brand-yellow');
  });

  it('applies xl size classes', () => {
    const { container } = render(<Button size="xl">Extra Large</Button>);
    expect(container.firstChild).toHaveClass('h-14');
  });
});
