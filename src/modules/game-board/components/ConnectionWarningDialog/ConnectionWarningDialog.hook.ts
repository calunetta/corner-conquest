import { useCallback, useEffect, useRef, useState } from 'react';
import { useToast } from '@/modules/shared';
import { useGameBoard } from '../../game-board.provider';
import { STALE_THRESHOLD_MS } from '../../game-board.staleness.hook';
import { writeHeartbeat } from '../../services/game-board.engine.service';
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
  const { gameState, localPlayer, serverGameState } = useGameBoard();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const intervalId = setInterval(() => setNow(Date.now()), TICK_INTERVAL_MS);
    return () => clearInterval(intervalId);
  }, []);

  // Live record for the local seat: serverGameState is never turn-buffered, unlike gameState.
  // Falls back to localPlayer only if the seat is ever missing from serverGameState (should not
  // happen in practice; playerId is a stable session id, same pattern as game-board.state.hook.ts).
  const livePlayer =
    serverGameState.players.find((player) => player.playerId === localPlayer.playerId) ?? localPlayer;

  const viewModel = toConnectionWarningViewModel(
    serverGameState.heartbeats[livePlayer.id] ?? null,
    now,
    gameState.status,
    livePlayer.isBot,
    WARNING_THRESHOLD_MS,
    STALE_THRESHOLD_MS,
  );

  useEffect(() => {
    if (viewModel.isOpen) playConnectionWarningTone();
  }, [viewModel.isOpen]);

  const { toast } = useToast();
  const [isDismissing, setIsDismissing] = useState(false);

  // Updated every render (not in an effect) so the ref is current by the time the async write's
  // .catch reads it — this is the race guard for the stale-toast gap: a forced write can fail
  // after the dialog already closed via the normal recovery/takeover path.
  const isOpenRef = useRef(viewModel.isOpen);
  isOpenRef.current = viewModel.isOpen;

  const onDismiss = useCallback(() => {
    setIsDismissing(true);
    writeHeartbeat(gameState.id, localPlayer.id)
      .catch((error) => {
        console.error('Error forcing heartbeat:', error);
        if (!isOpenRef.current) return; // dialog already closed via another path — no stale toast
        toast({
          title: "Still can't reach you",
          description: 'Check your connection and try again.',
          variant: 'destructive',
        });
      })
      .finally(() => setIsDismissing(false));
  }, [gameState.id, localPlayer.id, toast]);

  return { ...viewModel, isDismissing, onDismiss };
}
