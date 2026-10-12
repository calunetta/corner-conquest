import { useEffect, useState } from 'react';
import { useGameBoard } from '../../game-board.provider';
import { STALE_THRESHOLD_MS } from '../../game-board.staleness.hook';
import { toConnectionWarningViewModel } from './ConnectionWarningDialog.map';
import type { ConnectionWarningViewModel } from './ConnectionWarningDialog.types';

const TICK_INTERVAL_MS = 1_000;

/** Lower than STALE_THRESHOLD_MS; leaves a 20s countdown window before the seat converts. */
export const WARNING_THRESHOLD_MS = 25_000;

/** Short tone on the hidden->open transition. Swallows any failure (autoplay restriction or no
 *  AudioContext support); the dialog's own text is never the sole signal for this feature. */
export function playConnectionWarningTone(): void {
  try {
    const AudioContextClass =
      window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const audioContext = new AudioContextClass();
    const oscillator = audioContext.createOscillator();
    oscillator.frequency.value = 440;
    oscillator.connect(audioContext.destination);
    oscillator.onended = () => void audioContext.close();
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.2);
  } catch (error) {
    console.error('Error playing connection warning tone:', error);
  }
}

/** Adapts the game board context into the connection-warning dialog's view model, ticking the
 *  countdown once a second and sounding a tone exactly once per hidden->open transition. */
export function useConnectionWarning(): ConnectionWarningViewModel {
  const { gameState, localPlayer } = useGameBoard();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const intervalId = setInterval(() => setNow(Date.now()), TICK_INTERVAL_MS);
    return () => clearInterval(intervalId);
  }, []);

  const viewModel = toConnectionWarningViewModel(
    localPlayer.lastSeenAt,
    now,
    gameState.status,
    localPlayer.isBot,
    WARNING_THRESHOLD_MS,
    STALE_THRESHOLD_MS,
  );

  useEffect(() => {
    if (viewModel.isOpen) playConnectionWarningTone();
  }, [viewModel.isOpen]);

  return viewModel;
}
