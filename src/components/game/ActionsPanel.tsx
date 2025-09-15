'use client';
import type { GameAction, GameState } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, Sword, ShoppingCart, Gem, Anchor, Zap, Album } from 'lucide-react';
import { Separator } from '../ui/separator';

type ActionsPanelProps = {
  onAction: (action: GameAction) => void;
  gameState: GameState;
  isMyTurn: boolean;
};

export function ActionsPanel({ onAction, gameState, isMyTurn }: ActionsPanelProps) {
  const { currentPlayerIndex, players, map, currentAction, specialCardsDeck, selectedArmyId } = gameState;
  const currentPlayer = players[currentPlayerIndex];
  const lastAction = currentPlayer.lastAction;
  
  const selectedArmy = selectedArmyId !== null ? currentPlayer.armies.find(a => a.id === selectedArmyId) : null;
  const currentTile = selectedArmy ? map[selectedArmy.position.y][selectedArmy.position.x] : null;

  const canCollect = selectedArmy && currentPlayer.positions.some(p => p.x === selectedArmy.position.x && p.y === selectedArmy.position.y);
  const canPosition = selectedArmy && currentTile && (currentTile.type === 'resource' || currentTile.type === 'base') && currentTile.resources.length > 0 && !currentPlayer.positions.some(p => p.x === selectedArmy!.position.x && p.y === selectedArmy!.position.y);
  const canAttack = selectedArmy && currentTile && (currentTile.occupants.length > 1 || (currentTile.type === 'monster' && !!currentTile.monsters && currentTile.monsters.length > 0));
  const canDeploy = currentPlayer.resources.food >= currentPlayer.nextArmyCost && currentPlayer.armyCount < 5 && !currentPlayer.actionsThisTurn.includes('deploy');
  const canBuyCard = currentPlayer.resources.gems >= 10 && specialCardsDeck.length > 0 && !currentPlayer.actionsThisTurn.includes('buy-card');
  const canUpgrade = currentPlayer.resources.iron >= 5 && !currentPlayer.actionsThisTurn.includes('upgrade');
  
  const mainActions: { id: GameAction; label: string; icon: React.ReactNode, disabled?: boolean }[] = [
    { id: 'collect', label: 'Collect', icon: <Gem/>, disabled: !canCollect || lastAction === 'move' },
    { id: 'attack', label: 'Attack', icon: <Shield />, disabled: !canAttack || lastAction === 'move' },
    { id: 'position', label: 'Position', icon: <Anchor />, disabled: !canPosition || lastAction === 'move' },
  ];

  const secondaryActions: { id: GameAction; label: string; icon: React.ReactNode, disabled?: boolean }[] = [
    { id: 'upgrade', label: `Upgrade (${currentPlayer.resources.iron}/5 Iron)`, icon: <Zap />, disabled: !canUpgrade },
    { id: 'buy-card', label: 'Buy Card (10 Gems)', icon: <ShoppingCart />, disabled: !canBuyCard },
    { id: 'deploy', label: `Deploy (${currentPlayer.resources.food}/${currentPlayer.nextArmyCost} Food)`, icon: <Sword />, disabled: !canDeploy },
    { id: 'show-cards', label: 'Show Cards', icon: <Album />, disabled: false },
  ];

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>Actions</CardTitle>
        <Button size="sm" onClick={() => onAction('end-turn')} disabled={!isMyTurn}>End Turn</Button>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 grid-rows-2 gap-2">
            {mainActions.map((action) => (
                <Button
                    key={action.id}
                    variant={currentAction === action.id ? 'default' : 'outline'}
                    onClick={() => onAction(action.id)}
                    disabled={!isMyTurn || action.disabled}
                    className="flex h-16 flex-col items-center justify-center gap-1 p-2 text-center"
                >
                    {action.icon}
                    <span className="whitespace-normal text-sm">{action.label}</span>
                </Button>
            ))}
        </div>
        <Separator className="my-2" />
        <div className="grid grid-cols-2 gap-2">
            {secondaryActions.map((action) => (
                <Button
                    key={action.id}
                    variant={currentAction === action.id ? 'default' : 'outline'}
                    onClick={() => onAction(action.id)}
                    disabled={!isMyTurn || action.disabled}
                    className="flex h-auto min-h-12 flex-col items-center justify-center gap-1 p-2 text-center text-xs sm:flex-row sm:text-sm"
                >
                    {action.icon}
                    <span className="whitespace-normal">{action.label}</span>
                </Button>
            ))}
        </div>
      </CardContent>
    </Card>
  );
}
