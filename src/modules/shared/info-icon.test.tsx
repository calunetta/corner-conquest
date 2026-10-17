import React from 'react';
import { render, screen } from '@testing-library/react';
import { InfoIcon } from './info-icon';
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

  describe('without an override', () => {
    it('renders the registry default src with the identity transform', () => {
      render(<InfoIcon />);

      const img = screen.getByRole('img', { hidden: true });
      expect(img).toHaveAttribute('src', '/sprites/icon_info.png');
      expect(img.parentElement).toHaveStyle({ transform: 'rotate(0deg) scale(1)' });
    });
  });

  describe('with a resolved override', () => {
    const OVERRIDE_SRC = '/uploads/info-custom.png';
    const OVERRIDE_TRANSFORM = 'rotate(90deg) scale(2)';

    beforeEach(() => {
      mockResolveIcon.mockReturnValue({
        source: { kind: 'image', src: OVERRIDE_SRC },
        transform: OVERRIDE_TRANSFORM,
      });
    });

    it('asks the resolver for the info icon id', () => {
      render(<InfoIcon />);

      expect(mockResolveIcon).toHaveBeenCalledWith('icon-info');
    });

    it('renders the resolved src instead of the registry default', () => {
      render(<InfoIcon />);

      expect(screen.getByRole('img', { hidden: true })).toHaveAttribute('src', OVERRIDE_SRC);
    });

    it('applies the resolved transform to the wrapper around the image', () => {
      render(<InfoIcon />);

      const img = screen.getByRole('img', { hidden: true });
      expect(img.parentElement).toHaveStyle({ transform: OVERRIDE_TRANSFORM });
    });

    it('keeps className and alt when the override is applied', () => {
      const { container } = render(<InfoIcon className="custom-class" />);

      expect(container.querySelector('span')).toHaveClass('custom-class');
      expect(screen.getByRole('img', { hidden: true })).toHaveAttribute('alt', 'Info');
    });
  });
});
