import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Modal } from './Modal';

// Mock next-intl
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  motion: {
    // biome-ignore lint/suspicious/noExplicitAny: mocking framework internals
    div: ({ children, onClick, className, ...props }: any) => (
      // biome-ignore lint/a11y/useKeyWithClickEvents: test mock
      // biome-ignore lint/a11y/noStaticElementInteractions: test mock
      <div onClick={onClick} className={className} {...props}>
        {children}
      </div>
    ),
  },
}));

describe('Modal', () => {
  it('renders content when isOpen is true', () => {
    render(
      <Modal isOpen={true} onClose={() => {}} title="Test Modal">
        <div>Modal Content</div>
      </Modal>,
    );
    expect(screen.getByText('Test Modal')).toBeInTheDocument();
    expect(screen.getByText('Modal Content')).toBeInTheDocument();
  });

  it('does not render when isOpen is false', () => {
    render(
      <Modal isOpen={false} onClose={() => {}} title="Test Modal">
        <div>Modal Content</div>
      </Modal>,
    );
    expect(screen.queryByText('Test Modal')).not.toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    const onClose = vi.fn();
    render(
      <Modal isOpen={true} onClose={onClose} title="Test Modal">
        <div>Content</div>
      </Modal>,
    );

    const closeButton = screen.getByLabelText('close');
    fireEvent.click(closeButton);
    expect(onClose).toHaveBeenCalled();
  });
});
