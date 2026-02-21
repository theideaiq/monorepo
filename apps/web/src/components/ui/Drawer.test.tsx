import { render, screen, fireEvent } from '@testing-library/react';
import { Drawer } from './Drawer';
import { vi, describe, it, expect } from 'vitest';

// Mock framer-motion since it uses requestAnimationFrame which can be tricky in jsdom
// However, simple mounting should be fine. If not, we can mock it.
// Let's try without mock first, as vitest/jsdom usually handles it okay-ish.

describe('Drawer', () => {
  it('renders correctly when open', () => {
    render(
      <Drawer isOpen={true} onClose={() => {}} title="Test Drawer">
        <div>Content</div>
      </Drawer>
    );

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Test Drawer')).toBeInTheDocument();
    expect(screen.getByText('Content')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(
      <Drawer isOpen={false} onClose={() => {}} title="Test Drawer">
        <div>Content</div>
      </Drawer>
    );

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('calls onClose when Escape is pressed', () => {
    const onClose = vi.fn();
    render(
      <Drawer isOpen={true} onClose={onClose} title="Test Drawer">
        <div>Content</div>
      </Drawer>
    );

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });

  it('has correct accessibility attributes', () => {
    render(
      <Drawer isOpen={true} onClose={() => {}} title="Test Drawer">
        <div>Content</div>
      </Drawer>
    );

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-labelledby');

    const titleId = dialog.getAttribute('aria-labelledby');
    // Ensure ID is not null
    expect(titleId).not.toBeNull();
    if (titleId) {
      // eslint-disable-next-line testing-library/no-node-access
      const title = document.getElementById(titleId);
      expect(title).toBeInTheDocument();
      expect(title).toHaveTextContent('Test Drawer');
    }
  });

  it('focuses the drawer content on open', () => {
     render(
      <Drawer isOpen={true} onClose={() => {}} title="Test Drawer">
        <div>Content</div>
      </Drawer>
    );

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveFocus();
  });
});
