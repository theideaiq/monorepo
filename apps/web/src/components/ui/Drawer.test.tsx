import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Drawer } from './Drawer';

describe('Drawer', () => {
  const onClose = vi.fn();
  const title = "Test Drawer";
  const content = "Drawer Content";

  it('renders correctly when open', () => {
    render(
      <Drawer isOpen={true} onClose={onClose} title={title}>
        <div>{content}</div>
      </Drawer>
    );

    // Should render the title and content
    expect(screen.getByText(title)).toBeInTheDocument();
    expect(screen.getByText(content)).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(
      <Drawer isOpen={false} onClose={onClose} title={title}>
        <div>{content}</div>
      </Drawer>
    );

    expect(screen.queryByText(title)).not.toBeInTheDocument();
  });

  it('has accessible role and attributes', () => {
    render(
      <Drawer isOpen={true} onClose={onClose} title={title}>
        <div>{content}</div>
      </Drawer>
    );

    // Look for the dialog role
    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute('aria-modal', 'true');

    // Check aria-labelledby
    const titleElement = screen.getByText(title);
    expect(dialog).toHaveAttribute('aria-labelledby', titleElement.id);
  });

  it('calls onClose when close button is clicked', () => {
    render(
      <Drawer isOpen={true} onClose={onClose} title={title}>
        <div>{content}</div>
      </Drawer>
    );

    const closeButton = screen.getByRole('button', { name: /close/i });
    fireEvent.click(closeButton);
    expect(onClose).toHaveBeenCalled();
  });

  it('calls onClose when Escape key is pressed', () => {
    render(
      <Drawer isOpen={true} onClose={onClose} title={title}>
        <div>{content}</div>
      </Drawer>
    );

    fireEvent.keyDown(window, { key: 'Escape', code: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });
});
