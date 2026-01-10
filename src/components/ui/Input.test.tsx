import { fireEvent, render, screen } from '@testing-library/react';
import { Input } from './Input';

describe('Input Component', () => {
  it('renders correctly with label', () => {
    render(<Input label="Email" id="email" />);
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
  });

  it('renders input with correct type', () => {
    render(<Input type="email" placeholder="test@example.com" />);
    const input = screen.getByPlaceholderText('test@example.com');
    expect(input).toHaveAttribute('type', 'email');
  });

  it('toggles password visibility', () => {
    render(<Input type="password" placeholder="Enter password" />);
    const input = screen.getByPlaceholderText('Enter password');
    expect(input).toHaveAttribute('type', 'password');

    const toggleButton = screen.getByRole('button', { name: /show password/i });
    fireEvent.click(toggleButton);

    expect(input).toHaveAttribute('type', 'text');
    expect(
      screen.getByRole('button', { name: /hide password/i }),
    ).toBeInTheDocument();

    fireEvent.click(toggleButton);
    expect(input).toHaveAttribute('type', 'password');
  });

  it('displays error message and sets aria attributes', () => {
    render(<Input error="Invalid email" id="email-error-test" />);
    const errorMessage = screen.getByText('Invalid email');
    const input = screen.getByRole('textbox');

    expect(errorMessage).toBeInTheDocument();
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAttribute('aria-describedby', 'email-error-test-error');
    expect(errorMessage).toHaveAttribute('id', 'email-error-test-error');
  });
});
