import React from 'react';
import { render, screen } from '@testing-library/react';
import { ResourceIcon } from './resource-icon';
import { ResourceType } from '@/lib/types';

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

describe('ResourceIcon', () => {
  it.each([
    [ResourceType.Food, '/sprites/icon_meat.png', 'Food'],
    [ResourceType.Wood, '/sprites/icon_wood.png', 'Wood'],
    [ResourceType.Gold, '/sprites/icon_gold.png', 'Gold'],
  ])('renders img with correct src and alt for %s', (type, expectedSrc, expectedAlt) => {
    render(<ResourceIcon type={type} />);

    const img = screen.getByRole('img', { hidden: true });
    expect(img).toHaveAttribute('src', expectedSrc);
    expect(img).toHaveAttribute('alt', expectedAlt);
  });

  it('applies className to the span wrapper', () => {
    const { container } = render(<ResourceIcon type={ResourceType.Gold} className="custom-class" />);

    const span = container.querySelector('span');
    expect(span).toHaveClass('custom-class');
  });

  it('renders null for unknown resource type', () => {
    const { container } = render(
      <ResourceIcon type={'unknown' as unknown as typeof ResourceType[keyof typeof ResourceType]} />
    );

    expect(container.firstChild).toBeNull();
  });

  it('renders the span wrapper with default classes', () => {
    const { container } = render(<ResourceIcon type={ResourceType.Food} />);

    const span = container.querySelector('span');
    expect(span).toHaveClass('relative', 'inline-flex', 'items-center', 'justify-center', 'shrink-0');
  });
});
