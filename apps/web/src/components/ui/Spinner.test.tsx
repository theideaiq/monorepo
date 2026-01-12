import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PageLoader, Spinner } from './Spinner';

describe('Spinner', () => {
  it('renders correctly', () => {
    render(<Spinner />);
    // Loader2 from lucide-react renders an SVG.
    // We can check if it exists. It usually has class "lucide-loader-2" or similar,
    // but our component adds specific classes.
    const spinner = document.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(<Spinner className="custom-spinner" />);
    const spinner = document.querySelector('.custom-spinner');
    expect(spinner).toBeInTheDocument();
  });
});

describe('PageLoader', () => {
  it('renders spinner and loading text', () => {
    render(<PageLoader />);
    expect(screen.getByText('Loading System...')).toBeInTheDocument();
    const spinner = document.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });
});
