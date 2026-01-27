import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Drawer } from './Drawer';

describe('Drawer', () => {
  it('renders correctly when open', () => {
    const onClose = vi.fn();
    render(
      <Drawer isOpen={true} onClose={onClose} title="Test Drawer">
        <p>Drawer Content</p>
      </Drawer>,
    );

    expect(screen.getByText('Test Drawer')).toBeInTheDocument();
    expect(screen.getByText('Drawer Content')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    const onClose = vi.fn();
    render(
      <Drawer isOpen={false} onClose={onClose} title="Test Drawer">
        <p>Drawer Content</p>
      </Drawer>,
    );

    expect(screen.queryByText('Test Drawer')).not.toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    const onClose = vi.fn();
    render(
      <Drawer isOpen={true} onClose={onClose} title="Test Drawer">
        <p>Drawer Content</p>
      </Drawer>,
    );

    // Assuming the close button will have the aria-label "Close drawer" after my changes
    // Currently it doesn't, so I might target it by SVG presence or class if this fails before implementation.
    // But for TDD, I should write the test for the desired state.
    const closeButton = screen.getByRole('button', { name: /close/i });
    fireEvent.click(closeButton);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('has correct accessibility attributes', () => {
    const onClose = vi.fn();
    render(
      <Drawer isOpen={true} onClose={onClose} title="Test Drawer">
        <p>Drawer Content</p>
      </Drawer>,
    );

    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-labelledby');

    // Check if aria-labelledby points to the title
    const labelledBy = dialog.getAttribute('aria-labelledby');
    const title = screen.getByText('Test Drawer');
    expect(title).toHaveAttribute('id', labelledBy);
  });

  it('closes on Escape key press', () => {
    const onClose = vi.fn();
    render(
      <Drawer isOpen={true} onClose={onClose} title="Test Drawer">
        <p>Drawer Content</p>
      </Drawer>,
    );

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
