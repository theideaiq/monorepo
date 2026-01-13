import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Textarea } from './Textarea';

describe('Textarea', () => {
  it('renders label correctly', () => {
    render(<Textarea label="Bio" />);
    expect(screen.getByLabelText('Bio')).toBeInTheDocument();
  });

  it('accepts input', () => {
    const handleChange = vi.fn();
    render(<Textarea label="Bio" onChange={handleChange} />);

    const textarea = screen.getByLabelText('Bio');
    fireEvent.change(textarea, { target: { value: 'Hello world' } });

    expect(handleChange).toHaveBeenCalled();
    expect((textarea as HTMLTextAreaElement).value).toBe('Hello world');
  });

  it('shows error message and error styles', () => {
    render(<Textarea error="Field required" />);
    expect(screen.getByText('Field required')).toBeInTheDocument();
    const textarea = screen.getByRole('textbox');
    expect(textarea).toHaveClass('border-red-500');
  });

  it('applies custom className', () => {
    render(<Textarea className="custom-area" />);
    const textarea = screen.getByRole('textbox');
    expect(textarea).toHaveClass('custom-area');
  });
});
