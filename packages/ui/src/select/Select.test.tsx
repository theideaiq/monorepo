import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Select } from './Select';

describe('Select', () => {
  const options = [
    { value: 'opt1', label: 'Option 1' },
    { value: 'opt2', label: 'Option 2' },
  ];

  it('renders label correctly', () => {
    render(<Select label="Test Label" options={options} />);
    expect(screen.getByLabelText('Test Label')).toBeInTheDocument();
  });

  it('renders options correctly', () => {
    render(<Select options={options} />);
    expect(screen.getByText('Option 1')).toBeInTheDocument();
    expect(screen.getByText('Option 2')).toBeInTheDocument();
  });

  it('calls onChange when value changes', () => {
    const handleChange = vi.fn();
    render(<Select options={options} onChange={handleChange} label="Select" />);

    const select = screen.getByLabelText('Select');
    fireEvent.change(select, { target: { value: 'opt2' } });
    expect(handleChange).toHaveBeenCalled();
    expect((select as HTMLSelectElement).value).toBe('opt2');
  });

  it('shows error message when provided', () => {
    render(<Select options={options} error="Something went wrong" />);
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    const select = screen.getByRole('combobox');
    expect(select).toHaveClass('border-red-500');
  });
});
