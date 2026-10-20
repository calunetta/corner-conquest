import React from 'react';
import { render, screen } from '@testing-library/react';
import { RegistryIcon } from './registry-icon';
import type * as Icons from '@/modules/icons';

// jest.setup.js replaces lucide-react with a span stub. Unmock it here so the glyph renders as the
// real svg, which is what a player sees.
jest.unmock('lucide-react');

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

// The registry is fixed config, so each test picks the resolved source through this seam.
// Calls delegate to the real resolver unless a test swaps in a result.
const mockResolveIcon = jest.fn<Icons.ResolvedIcon, [id: string]>();
jest.mock('@/modules/icons', () => {
  const actualIcons = jest.requireActual<typeof Icons>('@/modules/icons');
  return { ...actualIcons, resolveIcon: (id: string) => mockResolveIcon(id) };
});

const actualIcons = jest.requireActual<typeof Icons>('@/modules/icons');

const IDENTITY_TRANSFORM = 'rotate(0deg) scale(1)';
const CUSTOM_TRANSFORM = 'rotate(30deg) scale(0.75)';

beforeEach(() => {
  mockResolveIcon.mockReset();
  mockResolveIcon.mockImplementation(actualIcons.resolveIcon);
});

describe('RegistryIcon', () => {
  describe('image source', () => {
    beforeEach(() => {
      mockResolveIcon.mockReturnValue({
        source: { kind: 'image', src: '/sprites/icon_fight.png' },
        transform: CUSTOM_TRANSFORM,
      });
    });

    it('asks the resolver for the given registry id', () => {
      render(<RegistryIcon id="icon-fight" />);

      expect(mockResolveIcon).toHaveBeenCalledWith('icon-fight');
    });

    it('tags the wrapper with a test id built from the registry id', () => {
      const { container } = render(<RegistryIcon id="icon-fight" />);

      expect(screen.getByTestId('registry-icon-icon-fight')).toContainElement(container.querySelector('img'));
    });

    it('renders an img with the resolved src and the given alt', () => {
      render(<RegistryIcon id="icon-fight" alt="Fight" />);

      const img = screen.getByRole('img', { hidden: true });
      expect(img).toHaveAttribute('src', '/sprites/icon_fight.png');
      expect(img).toHaveAttribute('alt', 'Fight');
    });

    it('applies the resolved transform to the inner span around the image', () => {
      const { container } = render(<RegistryIcon id="icon-fight" alt="Fight" />);

      const img = container.querySelector('img');
      expect(img?.parentElement).toHaveStyle({ transform: CUSTOM_TRANSFORM });
    });

    it('keeps the transform off the outer span', () => {
      const { container } = render(<RegistryIcon id="icon-fight" alt="Fight" />);

      expect(container.firstChild).not.toHaveStyle({ transform: CUSTOM_TRANSFORM });
    });

    it('renders an empty alt when no alt prop is given', () => {
      const { container } = render(<RegistryIcon id="icon-fight" />);

      const img = container.querySelector('img');
      expect(img).toHaveAttribute('alt', '');
    });
  });

  describe('lucide source', () => {
    beforeEach(() => {
      mockResolveIcon.mockReturnValue({
        source: { kind: 'lucide', name: 'Swords' },
        transform: CUSTOM_TRANSFORM,
      });
    });

    it('renders the lucide glyph as an svg and no img', () => {
      const { container } = render(<RegistryIcon id="swords" />);

      expect(container.querySelector('svg')).toBeInTheDocument();
      expect(container.querySelector('img')).toBeNull();
    });

    it('applies the resolved transform to the inner span around the glyph', () => {
      const { container } = render(<RegistryIcon id="swords" />);

      const svg = container.querySelector('svg');
      expect(svg?.parentElement).toHaveStyle({ transform: CUSTOM_TRANSFORM });
    });

    it('renders the glyph named by the resolved source', () => {
      mockResolveIcon.mockReturnValue({
        source: { kind: 'lucide', name: 'Skull' },
        transform: IDENTITY_TRANSFORM,
      });
      const { container } = render(<RegistryIcon id="skull" />);

      expect(container.querySelector('svg')).toHaveClass('lucide-skull');
    });

    it('renders nothing inside the inner span for an unknown lucide name', () => {
      mockResolveIcon.mockReturnValue({
        source: { kind: 'lucide', name: 'NotARealGlyph' },
        transform: IDENTITY_TRANSFORM,
      });
      const { container } = render(<RegistryIcon id="broken" />);

      expect(container.querySelector('svg')).toBeNull();
      expect(container.querySelector('img')).toBeNull();
      expect(container.querySelector('span > span')).toBeEmptyDOMElement();
    });
  });

  describe('className', () => {
    it('lands on the outer span', () => {
      mockResolveIcon.mockReturnValue({
        source: { kind: 'image', src: '/sprites/icon_info.png' },
        transform: IDENTITY_TRANSFORM,
      });
      const { container } = render(<RegistryIcon id="icon-info" className="custom-class" />);

      expect(container.firstChild).toHaveClass('custom-class');
    });

    it('lands on the outer span for a lucide source too', () => {
      const { container } = render(<RegistryIcon id="swords" className="custom-class" />);

      expect(container.firstChild).toHaveClass('custom-class');
    });
  });

  describe('aria-hidden', () => {
    it('is forwarded to the outer span when given', () => {
      const { container } = render(<RegistryIcon id="swords" aria-hidden />);

      expect(container.firstChild).toHaveAttribute('aria-hidden', 'true');
    });

    it('is absent from the outer span when omitted', () => {
      const { container } = render(<RegistryIcon id="swords" />);

      expect(container.firstChild).not.toHaveAttribute('aria-hidden');
    });
  });
});
