'use client';
import type { GameAction, GameState } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Move, Shield, Sword, ShoppingCart, Gem, Anchor } from 'lucide-react';

type ActionsPanelProps = {
  onAction: (action: GameAction) => void;
  gameState: GameState;
};

export function ActionsPanel({ onAction, gameState }: ActionsPanelProps) {
  const { currentPlayerIndex, players, map, currentAction, specialCardsDeck } = gameState;
  const currentPlayer = players[currentPlayerIndex];
  const lastAction = currentPlayer.lastAction;
  const currentTile = map[currentPlayer.position.y][currentPlayer.position.x];

  const canCollect = currentPlayer.positions.length > 0;
  const canPosition = currentPlayer.occupiedResourceTiles.length > 0;
  const canAttack = (currentTile.occupants.length > 1 && currentTile.type !== 'base') || (currentTile.type === 'monster' && !!currentTile.monsterDetails);
  const canDeploy = currentPlayer.resources.food >= currentPlayer.nextArmyCost && currentPlayer.armySize < 5 && currentTile.type === 'base';
  const canBuyCard = currentPlayer.resources.gems >= 10 && specialCardsDeck.length > 0;

  const actions: { id: GameAction; label: string; icon: React.ReactNode, disabled?: boolean, className?: string }[] = [
    { id: 'move', label: 'Move', icon: <Move className="mr-2 h-4 w-4" /> },
    { id: 'collect', label: 'Collect', icon: <Gem className="mr-2 h-4 w-4" />, disabled: !canCollect },
    { id: 'attack', label: 'Attack', icon: <Shield className="mr-2 h-4 w-4" />, disabled: !canAttack },
    { id: 'position', label: 'Position', icon: <Anchor className="mr-2 h-4 w-4" />, disabled: !canPosition },
    { id: 'buy-card', label: 'Buy Card (10 Gems)', icon: <ShoppingCart className="mr-2 h-4 w-4" />, disabled: !canBuyCard, className: 'col-span-2' },
    { id: 'deploy', label: `Deploy (${currentPlayer.nextArmyCost} Food)`, icon: <Sword className="mr-2 h-4 w-4" />, disabled: !canDeploy, className: 'col-span-2' },
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
            disabled={action.id === 'move' ? false : (action.id === lastAction || action.disabled)}
            className={`flex h-12 flex-col justify-center gap-1 px-2 text-xs sm:flex-row sm:text-sm ${action.className || ''}`}
          >
            {action.icon}
            <span>{action.label}</span>
          </Button>
        ))}
      </CardContent>
    </Card>
  );
}
