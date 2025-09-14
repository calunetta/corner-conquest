'use client';
import type { GameAction, GameState } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Move, Pickaxe, Shield, Wheat } from 'lucide-react';

type ActionsPanelProps = {
  onAction: (action: GameAction) => void;
  gameState: GameState;
};

export function ActionsPanel({ onAction, gameState }: ActionsPanelProps) {
  const { currentPlayerIndex, players, map, currentAction } = gameState;
  const currentPlayer = players[currentPlayerIndex];
  const lastAction = currentPlayer.lastAction;
  const currentTile = map[currentPlayer.position.y][currentPlayer.position.x];

  const canMine = currentTile.type === 'resource';
  const canFarm = players[currentPlayerIndex].occupiedResourceTiles.length > 0;
  const canAttack = (currentTile.occupants.length > 1 && currentTile.type !== 'base') || currentTile.type === 'monster';

  const actions: { id: GameAction; label: string; icon: React.ReactNode, disabled?: boolean }[] = [
    { id: 'move', label: 'Move', icon: <Move className="mr-2 h-4 w-4" /> },
    { id: 'mine', label: 'Mine', icon: <Pickaxe className="mr-2 h-4 w-4" />, disabled: !canMine },
    { id: 'attack', label: 'Attack', icon: <Shield className="mr-2 h-4 w-4" />, disabled: !canAttack },
    { id: 'farm', label: 'Farm', icon: <Wheat className="mr-2 h-4 w-4" />, disabled: !canFarm },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Actions</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-2">
        {actions.map((action) => (
          <Button
            key={action.id}
            variant={currentAction === action.id ? 'default' : 'outline'}
            onClick={() => onAction(action.id)}
            disabled={action.id === lastAction || action.disabled}
            className="flex h-12 flex-col justify-center gap-1 px-2 text-xs sm:flex-row sm:text-sm"
          >
            {action.icon}
            <span>{action.label}</span>
          </Button>
        ))}
      </CardContent>
    </Card>
  );
}
