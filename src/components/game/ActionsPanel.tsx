'use client';
import type { GameAction, GameState } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, Sword, ShoppingCart, Gem, Anchor, Zap } from 'lucide-react';

type ActionsPanelProps = {
  onAction: (action: GameAction) => void;
  gameState: GameState;
};

export function ActionsPanel({ onAction, gameState }: ActionsPanelProps) {
  const { currentPlayerIndex, players, map, currentAction, specialCardsDeck, selectedArmyId } = gameState;
  const currentPlayer = players[currentPlayerIndex];
  const lastAction = currentPlayer.lastAction;
  
  const selectedArmy = selectedArmyId !== null ? currentPlayer.armies.find(a => a.id === selectedArmyId) : null;
  const currentTile = selectedArmy ? map[selectedArmy.position.y][selectedArmy.position.x] : null;

  const canCollect = selectedArmy && currentPlayer.positions.some(p => p.x === selectedArmy.position.x && p.y === selectedArmy.position.y);
  const canPosition = selectedArmy && currentTile && (currentTile.type === 'resource' || currentTile.type === 'base') && !currentPlayer.positions.some(p => p.x === selectedArmy.position.x && p.y === selectedArmy.position.y);
  const canAttack = selectedArmy && currentTile && (currentTile.occupants.length > 1 || (currentTile.type === 'monster' && !!currentTile.monsters && currentTile.monsters.length > 0));
  const canDeploy = currentPlayer.resources.food >= currentPlayer.nextArmyCost && currentPlayer.armyCount < 5;
  const canBuyCard = currentPlayer.resources.gems >= 10 && specialCardsDeck.length > 0;
  const canUpgrade = currentPlayer.resources.iron >= 5;

  const actions: { id: GameAction; label: string; icon: React.ReactNode, disabled?: boolean, className?: string }[] = [
    { id: 'collect', label: 'Collect', icon: <Gem className="mr-2 h-4 w-4" />, disabled: !canCollect },
    { id: 'attack', label: 'Attack', icon: <Shield className="mr-2 h-4 w-4" />, disabled: !canAttack },
    { id: 'position', label: 'Position', icon: <Anchor className="mr-2 h-4 w-4" />, disabled: !canPosition },
    { id: 'upgrade', label: 'Upgrade (5 Iron)', icon: <Zap className="mr-2 h-4 w-4" />, disabled: !canUpgrade, className: 'col-span-2' },
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
            disabled={action.disabled || (lastAction !== null && action.id !== 'move')}
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
