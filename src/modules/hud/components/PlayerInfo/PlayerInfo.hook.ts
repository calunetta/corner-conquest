import { useMemo } from 'react';
import { useGameBoard } from '@/features/game/context/GameBoardContext';
import { useResourceGainEvents } from '@/modules/game-board';
import { RESOURCE_GAIN_ANIMATION_MS, useTransientPulses } from '@/modules/shared';
import { toPlayerInfoViewModel } from './PlayerInfo.map';
import type { PlayerInfoProps } from './PlayerInfo.types';
import type { PlayerInfoViewModel } from './PlayerInfo.types';

const NO_PULSE_TRIGGERS: { key: string }[] = [];

export function usePlayerInfo(props: PlayerInfoProps): PlayerInfoViewModel {
  const { turnTimer, isMyTurn, gameState, localPlayer } = useGameBoard();
  const resourceGainEvents = useResourceGainEvents(gameState);

  // Only the local player's own card animates its chips (ui-design.md:120); other cards stay still.
  const isLocalPlayerCard = localPlayer?.playerId === props.player.playerId;
  const playerId = props.player.playerId;
  const pulseTriggers = useMemo(
    () =>
      isLocalPlayerCard
        ? resourceGainEvents.filter((event) => event.playerId === playerId).map((event) => ({ key: event.type }))
        : NO_PULSE_TRIGGERS,
    [isLocalPlayerCard, playerId, resourceGainEvents],
  );
  const gainPulses = useTransientPulses(pulseTriggers, RESOURCE_GAIN_ANIMATION_MS);

  return toPlayerInfoViewModel(
    props.player,
    props.isCurrentPlayer,
    props.vpGoal ?? 10,
    turnTimer,
    isMyTurn,
    gainPulses,
  );
}
