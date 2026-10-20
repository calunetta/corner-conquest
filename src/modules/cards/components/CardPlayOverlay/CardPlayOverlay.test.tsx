import React from 'react';
import { act, render, screen, within } from '@testing-library/react';
import { CardName } from '@/lib/types';
import { CardPlayOverlay, CardPlayOverlayView } from './CardPlayOverlay';
import { extraMovePlay, foundExtraMovePlay, warChiefPlay } from './CardPlayOverlay.fixtures';

function renderView(props: Partial<React.ComponentProps<typeof CardPlayOverlayView>> = {}) {
  return render(
    <CardPlayOverlayView play={warChiefPlay} isMobile={false} isReducedMotion={false} {...props} />,
  );
}

describe('CardPlayOverlayView', () => {
  it('without a play renders an empty status region and no stage', () => {
    renderView({ play: null });

    expect(screen.getByRole('status')).toBeEmptyDOMElement();
    expect(screen.queryByTestId('card-play-stage')).not.toBeInTheDocument();
    expect(screen.queryByTestId('card-face')).not.toBeInTheDocument();
  });

  it('announces the played card in the status region', () => {
    renderView();

    expect(screen.getByRole('status')).toHaveTextContent('You played War Chief.');
  });

  it('announces a found card in the status region', () => {
    renderView({ play: foundExtraMovePlay });

    expect(screen.getByRole('status')).toHaveTextContent('You found Extra Move.');
    expect(screen.getByRole('status')).not.toHaveTextContent('You played');
  });

  it('shows the card face and the card name in the stage', () => {
    renderView();

    const stage = screen.getByTestId('card-play-stage');
    expect(within(stage).getByTestId('card-face')).toHaveAttribute('data-card', CardName.WarChief);
    expect(within(stage).getByText('War Chief')).toBeInTheDocument();
  });

  it('does not block pointer input and sits below the dialogs', () => {
    renderView();

    const root = screen.getByTestId('card-play-overlay');
    expect(root).toHaveClass('pointer-events-none');
    expect(root).toHaveClass('z-40');
  });

  it('uses the motion animation by default', () => {
    renderView();

    expect(screen.getByTestId('card-play-stage')).toHaveClass('animate-card-play');
  });

  it('uses an opacity-only animation with reduced motion', () => {
    renderView({ isReducedMotion: true });

    const stage = screen.getByTestId('card-play-stage');
    expect(stage).toHaveClass('animate-card-play-fade');
    expect(stage).not.toHaveClass('animate-card-play');
    expect(stage.className).not.toMatch(/translate|scale/);
  });

  it.each([
    [true, '150px'],
    [false, '200px'],
  ])('isMobile=%s gives a %s wide card', (isMobile, width) => {
    renderView({ isMobile });

    expect(screen.getByTestId('card-face')).toHaveStyle({ width });
  });

  it('hides the decorative stage and vignette from assistive tech', () => {
    renderView();

    const root = screen.getByTestId('card-play-overlay');
    expect(screen.getByTestId('card-play-stage')).toHaveAttribute('aria-hidden', 'true');
    const hidden = root.querySelectorAll(':scope > [aria-hidden="true"]');
    expect(hidden).toHaveLength(2);
    expect(screen.getByRole('status')).not.toHaveAttribute('aria-hidden');
  });

  it('remounts the stage when a new play starts', () => {
    const { rerender } = renderView();
    const first = screen.getByTestId('card-play-stage');

    rerender(<CardPlayOverlayView play={extraMovePlay} isMobile={false} isReducedMotion={false} />);

    const second = screen.getByTestId('card-play-stage');
    expect(second).not.toBe(first);
    expect(screen.getByRole('status')).toHaveTextContent('You played Extra Move.');
  });
});

describe('CardPlayOverlay (connected)', () => {
  const originalMatchMedia = window.matchMedia;

  beforeEach(() => {
    jest.useFakeTimers();
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      configurable: true,
      value: jest.fn((query: string) => ({
        matches: false,
        media: query,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      })),
    });
  });

  afterEach(() => {
    jest.useRealTimers();
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      configurable: true,
      value: originalMatchMedia,
    });
  });

  it('calls onFinished once after 1100 ms', () => {
    const onFinished = jest.fn();
    render(<CardPlayOverlay play={warChiefPlay} onFinished={onFinished} />);

    expect(screen.getByRole('status')).toHaveTextContent('You played War Chief.');
    act(() => jest.advanceTimersByTime(1099));
    expect(onFinished).not.toHaveBeenCalled();
    act(() => jest.advanceTimersByTime(1));
    expect(onFinished).toHaveBeenCalledTimes(1);
  });
});
