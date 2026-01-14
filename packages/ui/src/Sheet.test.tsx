import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from './Sheet';

// Radix uses ResizeObserver which might not be in jsdom
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

describe('Sheet', () => {
  it('renders content when triggered', async () => {
    render(
      <Sheet>
        <SheetTrigger>Open Sheet</SheetTrigger>
        <SheetContent>
          <SheetTitle>Test Sheet</SheetTitle>
          <div>Sheet Content</div>
        </SheetContent>
      </Sheet>,
    );

    const trigger = screen.getByText('Open Sheet');
    fireEvent.click(trigger);

    expect(await screen.findByText('Test Sheet')).toBeInTheDocument();
    expect(screen.getByText('Sheet Content')).toBeInTheDocument();
  });
});
