import { fireEvent, render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import { Drawer } from './Drawer';

describe('Drawer', () => {
  it('renders when isOpen is true', () => {
    render(
      <Drawer isOpen={true} onClose={() => {}}>
        <div>Drawer Content</div>
      </Drawer>,
    );
    expect(screen.getByText('Drawer Content')).toBeInTheDocument();
  });

  it('does not render when isOpen is false', () => {
    render(
      <Drawer isOpen={false} onClose={() => {}}>
        <div>Drawer Content</div>
      </Drawer>,
    );
    expect(screen.queryByText('Drawer Content')).not.toBeInTheDocument();
  });

  it('has correct accessibility attributes', () => {
    const title = 'Test Drawer';
    render(
      <Drawer isOpen={true} onClose={() => {}} title={title}>
        <div>Drawer Content</div>
      </Drawer>,
    );

    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-labelledby');

    // Check if aria-labelledby points to the title
    const titleElement = screen.getByText(title);
    expect(titleElement.id).toBe(dialog.getAttribute('aria-labelledby'));
  });

  it('close button has aria-label', () => {
    render(
      <Drawer isOpen={true} onClose={() => {}}>
        <div>Drawer Content</div>
      </Drawer>,
    );

    const closeButton = screen.getByRole('button', { name: /close drawer/i });
    expect(closeButton).toBeInTheDocument();
  });

  it('calls onClose when Escape key is pressed', () => {
    const onClose = vi.fn();
    render(
      <Drawer isOpen={true} onClose={onClose}>
        <div>Drawer Content</div>
      </Drawer>,
    );

    fireEvent.keyDown(window, { key: 'Escape', code: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });
});
