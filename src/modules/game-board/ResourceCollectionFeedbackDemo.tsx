'use client';

import { useState } from 'react';
import type { GameState, Player, StructuredLogEntry } from '@/lib/types';
import { ResourceType } from '@/lib/types';
import { useToast } from '@/modules/shared';
import { Button } from '@/components/ui/button';
import { useResourceCollectionFeedback } from './resource-collection-feedback.hook';
import { buildDemoGameState, buildDemoPlayer } from './ResourceCollectionFeedbackDemo.fixtures';

/** Replicates one turn cycle so the toast/log/position-clear behavior can be triggered on demand
 *  and watched directly, instead of playing a full match. See docs/ai/tasks/2026-10-11-resource-collection-feedback. */
export function ResourceCollectionFeedbackDemo() {
  const { toast } = useToast();
  const [gameState, setGameState] = useState<GameState>(buildDemoGameState);
  const [player, setPlayer] = useState<Player>(buildDemoPlayer);
  const [isMyTurn, setIsMyTurn] = useState(true);

  useResourceCollectionFeedback({ gameState, localPlayer: player, isMyTurn, toast });

  function appendCollectionEntry(entry: Omit<StructuredLogEntry, 'kind' | 'turn'>) {
    setGameState((prev) => ({
      ...prev,
      turn: prev.turn + 1,
      log: [...prev.log, { kind: 'structured', turn: prev.turn + 1, ...entry }],
    }));
    // Mirrors the real clear-on-collect rule: the collected spot is removed from `positions`.
    setPlayer((prev) => ({ ...prev, positions: [] }));
  }

  function simulateAutomaticCollection() {
    appendCollectionEntry({
      category: 'economy',
      isPassive: true,
      playerId: player.playerId,
      message: `${player.playerId} automatically collected 2 gold.`,
      resourcesCollected: { [ResourceType.Gold]: 2 },
    });
  }

  function simulateProductiveCollection() {
    appendCollectionEntry({
      category: 'economy',
      playerId: player.playerId,
      message: `${player.playerId} collected 4 gold (doubled gold).`,
      resourcesCollected: { [ResourceType.Gold]: 4 },
    });
  }

  function positionArmyOnGold() {
    setPlayer((prev) => ({ ...prev, positions: [{ x: 1, y: 0, resource: ResourceType.Gold, armyId: 0 }] }));
  }

  function startNextTurn() {
    setIsMyTurn(false);
    setTimeout(() => setIsMyTurn(true), 50);
  }

  function reset() {
    setGameState(buildDemoGameState());
    setPlayer(buildDemoPlayer());
    setIsMyTurn(true);
  }

  const isPositioned = player.positions.length > 0;

  return (
    <div className="space-y-4 max-w-xl">
      <div className="flex flex-wrap gap-2">
        <Button onClick={simulateAutomaticCollection}>Simulate automatic collection (no card)</Button>
        <Button onClick={simulateProductiveCollection}>Simulate Productive-card collection (doubled)</Button>
        <Button onClick={positionArmyOnGold} variant="outline">
          Position army on Gold
        </Button>
        <Button onClick={startNextTurn} variant="outline">
          Start next turn
        </Button>
        <Button onClick={reset} variant="destructive">
          Reset
        </Button>
      </div>

      <div className="text-sm space-y-1 rounded border border-border p-3">
        <div>
          <strong>isMyTurn:</strong> {String(isMyTurn)}
        </div>
        <div>
          <strong>army positioned:</strong> {String(isPositioned)}
        </div>
        <div>
          <strong>log entries:</strong> {gameState.log.length}
        </div>
      </div>

      <div className="text-sm space-y-1">
        <strong>Event log:</strong>
        <ul className="list-disc pl-5">
          {gameState.log.map((entry, i) => (
            <li key={i}>{typeof entry === 'string' ? entry : entry.message}</li>
          ))}
          {gameState.log.length === 0 && <li className="text-muted-foreground">(empty)</li>}
        </ul>
      </div>
    </div>
  );
}
