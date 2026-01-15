import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import GlobalLoader from './GlobalLoader';

// Mock framer-motion to avoid animation delays
vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  motion: {
    // biome-ignore lint/suspicious/noExplicitAny: mocking framework internals
    div: ({ children, className, ...props }: any) => (
      <div className={className} {...props}>
        {children}
      </div>
    ),
  },
}));

describe('GlobalLoader', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders initially', () => {
    render(<GlobalLoader />);
    expect(screen.getByText('I')).toBeInTheDocument();
  });

  it('disappears after 2 seconds', async () => {
    render(<GlobalLoader />);
    expect(screen.getByText('I')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    // With framer-motion mocked to be instant (pass-through),
    // the state update setIsVisible(false) should immediately remove the component from the DOM
    // because AnimatePresence just renders children or null based on presence.
    // However, AnimatePresence logic is inside the component state (isVisible).

    // When isVisible becomes false, AnimatePresence (mocked) receives false (or null children).
    // So it should render nothing.

    // We can use waitFor just to be safe with React state updates,
    // but advanceTimersByTime inside act should handle it.

    expect(screen.queryByText('I')).not.toBeInTheDocument();
  });
});
