import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Drawer } from './Drawer';
import type React from 'react';

// Mock react-dom createPortal
vi.mock('react-dom', async () => {
  const actual = await vi.importActual('react-dom');
  return {
    ...actual,
    createPortal: (node: React.ReactNode) => node,
  };
});

// Mock AnimatePresence to just render children
vi.mock('framer-motion', async () => {
  const actual = await vi.importActual('framer-motion');
  return {
    ...actual,
    AnimatePresence: ({ children }: { children: React.ReactNode }) => (
      <>{children}</>
    ),
  };
});

describe('Drawer', () => {
  const onClose = vi.fn();

  beforeEach(() => {
    onClose.mockClear();
  });

  it('renders correctly when open', () => {
    render(
      <Drawer isOpen={true} onClose={onClose} title="Test Drawer">
        <div>Drawer Content</div>
      </Drawer>,
    );

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Test Drawer')).toBeInTheDocument();
    expect(screen.getByText('Drawer Content')).toBeInTheDocument();
    expect(screen.getByLabelText('Close drawer')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(
      <Drawer isOpen={false} onClose={onClose} title="Test Drawer">
        <div>Drawer Content</div>
      </Drawer>,
    );

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    render(
      <Drawer isOpen={true} onClose={onClose} title="Test Drawer">
        <div>Drawer Content</div>
      </Drawer>,
    );

    fireEvent.click(screen.getByLabelText('Close drawer'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when Escape key is pressed', () => {
    render(
      <Drawer isOpen={true} onClose={onClose} title="Test Drawer">
        <div>Drawer Content</div>
      </Drawer>,
    );

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('has correct ARIA attributes', () => {
    render(
      <Drawer isOpen={true} onClose={onClose} title="Test Drawer">
        <div>Drawer Content</div>
      </Drawer>,
    );

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-labelledby');
  });
});
