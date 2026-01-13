import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Card } from './Card';

describe('Card', () => {
  it('renders children correctly', () => {
    render(
      <Card>
        <div>Card Content</div>
      </Card>,
    );
    expect(screen.getByText('Card Content')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(
      <Card className="custom-card-class">
        <div>Content</div>
      </Card>,
    );
    // Find the card container. Since Card renders a div with the class, we can query by text's parent
    const cardContent = screen.getByText('Content');
    const card = cardContent.parentElement;
    expect(card).toHaveClass('custom-card-class');
  });
});
