import { act, render, screen } from '@testing-library/react';
import { LobbyBackground } from './LobbyBackground';
import { SAMPLE_CLOUDS } from './LobbyBackground.fixtures';
import { useLobbyBackground } from './LobbyBackground.hook';
import { CLOUD_SPAWN } from './LobbyBackground.layout';
import type { LobbyBackgroundViewModel } from './LobbyBackground.types';

// Only the real hook's timer test needs the real implementation; every other test feeds fixed clouds.
const actualHook = jest.requireActual<{ useLobbyBackground: () => LobbyBackgroundViewModel }>(
  './LobbyBackground.hook',
);

// next/image renders a plain <img> so the sprite src is visible in the DOM.
jest.mock('next/image', () => ({
  __esModule: true,
  default: ({ src, alt, className }: { src: string; alt: string; className?: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} className={className} />
  ),
}));

jest.mock('./LobbyBackground.hook', () => ({
  useLobbyBackground: jest.fn(),
}));

const BASE_CASTLE_SRC = '/sprites/castle_blue.png';
const RESOURCE_SPRITE_SRCS = ['/sprites/sheep.gif', '/sprites/tree.gif', '/sprites/mine.png'];
const MONSTER_IDLE_SRC = '/sprites/minotaur_idle.gif';
const ISLAND_IMAGE_COUNT = 1 + RESOURCE_SPRITE_SRCS.length + 1;

function renderedImageSources(container: HTMLElement): string[] {
  return Array.from(container.querySelectorAll('img')).map((img) => img.getAttribute('src') ?? '');
}

describe('LobbyBackground', () => {
  beforeEach(() => {
    jest.mocked(useLobbyBackground).mockReturnValue({ clouds: SAMPLE_CLOUDS });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('is hidden from assistive technology because it is decoration only', () => {
    const { container } = render(<LobbyBackground />);

    expect(container.firstElementChild).toHaveAttribute('aria-hidden', 'true');
  });

  it('renders the base castle, the three resource nodes and the Minotaur in island order', () => {
    const { container } = render(<LobbyBackground />);
    const islandSources = renderedImageSources(container).slice(SAMPLE_CLOUDS.length);

    expect(islandSources).toEqual([BASE_CASTLE_SRC, ...RESOURCE_SPRITE_SRCS, MONSTER_IDLE_SRC]);
    expect(islandSources).toHaveLength(ISLAND_IMAGE_COUNT);
  });

  it('names the monster island sprite after the Minotaur', () => {
    render(<LobbyBackground />);

    expect(screen.getByAltText('Minotaur')).toBeInTheDocument();
  });

  it('draws one sprite per cloud the hook returns, in the order it returns them', () => {
    const { container } = render(<LobbyBackground />);
    const cloudSources = renderedImageSources(container).slice(0, SAMPLE_CLOUDS.length);

    expect(cloudSources).toEqual(SAMPLE_CLOUDS.map((cloud) => cloud.sprite));
  });

  it('draws no cloud sprites when the hook has no live clouds', () => {
    jest.mocked(useLobbyBackground).mockReturnValue({ clouds: [] });

    const { container } = render(<LobbyBackground />);

    expect(renderedImageSources(container)).toEqual([BASE_CASTLE_SRC, ...RESOURCE_SPRITE_SRCS, MONSTER_IDLE_SRC]);
  });

  it('renders without React or Radix warnings', () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    render(<LobbyBackground />);

    expect(consoleError).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });

  describe('cloud spawning with the real hook', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.mocked(useLobbyBackground).mockImplementation(actualHook.useLobbyBackground);
    });

    it('shows no cloud before the first spawn interval, then one cloud at the interval', () => {
      const { container } = render(<LobbyBackground />);

      expect(container.querySelectorAll('img')).toHaveLength(ISLAND_IMAGE_COUNT);

      act(() => {
        jest.advanceTimersByTime(CLOUD_SPAWN.spawnIntervalMs - 1);
      });
      expect(container.querySelectorAll('img')).toHaveLength(ISLAND_IMAGE_COUNT);

      act(() => {
        jest.advanceTimersByTime(1);
      });
      expect(container.querySelectorAll('img')).toHaveLength(ISLAND_IMAGE_COUNT + 1);
    });
  });
});
