import React from 'react';
import { render, screen } from '@testing-library/react';
import { InfoIcon } from './info-icon';

// Mock next/image to avoid issues with Image component in tests
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => {
    const rest = { ...props };
    delete rest.unoptimized;
    // eslint-disable-next-line jsx-a11y/alt-text, @next/next/no-img-element
    return <img {...rest} />;
  },
}));

describe('InfoIcon', () => {
  it('renders img with correct src and alt', () => {
    render(<InfoIcon />);

    const img = screen.getByRole('img', { hidden: true });
    expect(img).toHaveAttribute('src', '/sprites/icon_info.png');
    expect(img).toHaveAttribute('alt', 'Info');
  });

  it('applies className to the span wrapper', () => {
    const { container } = render(<InfoIcon className="custom-class" />);

    const span = container.querySelector('span');
    expect(span).toHaveClass('custom-class');
  });

  it('renders the span wrapper with default classes', () => {
    const { container } = render(<InfoIcon />);

    const span = container.querySelector('span');
    expect(span).toHaveClass('relative', 'inline-flex', 'items-center', 'justify-center', 'shrink-0');
  });

  it('renders with correct dimensions', () => {
    render(<InfoIcon />);

    const img = screen.getByRole('img', { hidden: true });
    expect(img).toHaveAttribute('width', '32');
    expect(img).toHaveAttribute('height', '32');
  });
});
