import { useState } from 'react';
import type { ResourceType } from '@/lib/types';
import { toPlayerOptions, toResourceOptions } from './StealResourceDialog.map';
import type { StealResourceDialogProps, StealResourceStep } from './StealResourceDialog.types';

export interface StealResourceDialogState {
  step: StealResourceStep;
  onSelectPlayer: (playerId: number) => void;
  onSelectResource: (resource: ResourceType) => void;
  onBack: () => void;
  onSteal: () => void;
  onClose: () => void;
}

/**
 * Two-step flow: pick a target player, then pick which of their resources to steal.
 * Mirrors legacy StealResourceDialog.tsx's local state exactly (legacy :26-32, :161, :167).
 */
export function useStealResourceDialog(props: StealResourceDialogProps): StealResourceDialogState {
  const { players, onSteal, onClose } = props;
  const [selectedPlayerId, setSelectedPlayerId] = useState<number | null>(null);
  const [selectedResource, setSelectedResource] = useState<ResourceType | null>(null);

  const selectedPlayer = players.find((player) => player.id === selectedPlayerId) ?? null;

  const handleSelectPlayer = (playerId: number): void => {
    setSelectedPlayerId(playerId);
    setSelectedResource(null);
  };

  const handleBack = (): void => {
    setSelectedPlayerId(null);
  };

  const handleSteal = (): void => {
    if (selectedPlayerId === null || selectedResource === null) return;
    onSteal(selectedPlayerId, selectedResource);
  };

  const step: StealResourceStep = selectedPlayer
    ? {
        kind: 'resource',
        playerName: selectedPlayer.name,
        playerId: selectedPlayer.id,
        options: toResourceOptions(selectedPlayer, selectedResource),
        canConfirm: selectedResource !== null,
      }
    : { kind: 'player', options: toPlayerOptions(players, selectedPlayerId) };

  return {
    step,
    onSelectPlayer: handleSelectPlayer,
    onSelectResource: setSelectedResource,
    onBack: handleBack,
    onSteal: handleSteal,
    onClose,
  };
}
