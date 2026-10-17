import React from 'react';
import { render, screen } from '@testing-library/react';
import { ResourceIcon } from './resource-icon';
import { ResourceType } from '@/lib/types';
import type * as Icons from '@/modules/icons';

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

// The real icon-overrides.config.json is {}, so an override can only reach the component through
// this seam. Calls delegate to the real resolver unless a test swaps in a result.
const mockResolveIcon = jest.fn<Icons.ResolvedIcon, [id: string]>();
jest.mock('@/modules/icons', () => {
  const actualIcons = jest.requireActual<typeof Icons>('@/modules/icons');
  return { ...actualIcons, resolveIcon: (id: string) => mockResolveIcon(id) };
});

const actualIcons = jest.requireActual<typeof Icons>('@/modules/icons');

beforeEach(() => {
  mockResolveIcon.mockReset();
  mockResolveIcon.mockImplementation(actualIcons.resolveIcon);
});

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

  describe('without an override', () => {
    it.each([
      [ResourceType.Food, '/sprites/icon_meat.png'],
      [ResourceType.Wood, '/sprites/icon_wood.png'],
      [ResourceType.Gold, '/sprites/icon_gold.png'],
    ])('renders the registry default src and identity transform for %s', (type, expectedSrc) => {
      render(<ResourceIcon type={type} />);

      const img = screen.getByRole('img', { hidden: true });
      expect(img).toHaveAttribute('src', expectedSrc);
      expect(img.parentElement).toHaveStyle({ transform: 'rotate(0deg) scale(1)' });
    });
  });

  describe('with a resolved override', () => {
    const OVERRIDE_TRANSFORM = 'rotate(180deg) scale(1.5)';

    beforeEach(() => {
      mockResolveIcon.mockImplementation((id: string) => ({
        source: { kind: 'image', src: `/uploads/${id}-custom.png` },
        transform: OVERRIDE_TRANSFORM,
      }));
    });

    it.each([
      [ResourceType.Food, 'icon-meat', '/uploads/icon-meat-custom.png'],
      [ResourceType.Wood, 'icon-wood', '/uploads/icon-wood-custom.png'],
      [ResourceType.Gold, 'icon-gold', '/uploads/icon-gold-custom.png'],
    ])('resolves the registry id for %s and renders its src', (type, expectedId, expectedSrc) => {
      render(<ResourceIcon type={type} />);

      expect(mockResolveIcon).toHaveBeenCalledWith(expectedId);
      expect(screen.getByRole('img', { hidden: true })).toHaveAttribute('src', expectedSrc);
    });

    it('applies the resolved transform to the wrapper around the image', () => {
      render(<ResourceIcon type={ResourceType.Wood} />);

      const img = screen.getByRole('img', { hidden: true });
      expect(img.parentElement).toHaveStyle({ transform: OVERRIDE_TRANSFORM });
    });

    it('keeps className and alt when the override is applied', () => {
      const { container } = render(<ResourceIcon type={ResourceType.Gold} className="custom-class" />);

      expect(container.querySelector('span')).toHaveClass('custom-class');
      expect(screen.getByRole('img', { hidden: true })).toHaveAttribute('alt', 'Gold');
    });

    it('does not call the resolver for an unknown resource type', () => {
      const { container } = render(
        <ResourceIcon type={'unknown' as unknown as typeof ResourceType[keyof typeof ResourceType]} />
      );

      expect(container.firstChild).toBeNull();
      expect(mockResolveIcon).not.toHaveBeenCalled();
    });
  });
});
