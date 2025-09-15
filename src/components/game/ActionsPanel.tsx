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
  timeLeft: number;
  turnDuration: number;
};

export function ActionsPanel({ onAction, gameState, isMyTurn, timeLeft, turnDuration }: ActionsPanelProps) {
  const { currentPlayerIndex, players, map, currentAction, specialCardsDeck, selectedArmyId } = gameState;
  const currentPlayer = players[currentPlayerIndex];
  const lastAction = currentPlayer.lastAction;
  
  const selectedArmy = selectedArmyId !== null ? currentPlayer.armies.find(a => a.id === selectedArmyId) : null;
  const currentTile = selectedArmy ? map[selectedArmy.position.y][selectedArmy.position.x] : null;

  const hasMainActionCompleted = currentPlayer.actionsThisTurn.some(action => ['collect', 'position', 'attack'].includes(action));

  const canCollect = selectedArmy && currentPlayer.positions.some(p => p.x === selectedArmy.position.x && p.y === selectedArmy.position.y);
  const canPosition = selectedArmy && currentTile && (currentTile.type === 'resource' || currentTile.type === 'base') && currentTile.resources.length > 0 && !currentPlayer.positions.some(p => p.x === selectedArmy!.position.x && p.y === selectedArmy!.position.y);
  const canAttack = selectedArmy && currentTile && (currentTile.occupants.length > 1 || (currentTile.type === 'monster' && !!currentTile.monsters && currentTile.monsters.length > 0));
  const canDeploy = currentPlayer.resources.food >= currentPlayer.nextArmyCost && currentPlayer.armyCount < 5 && !currentPlayer.actionsThisTurn.includes('deploy');
  const canBuyCard = currentPlayer.resources.gems >= 10 && specialCardsDeck.length > 0 && !currentPlayer.actionsThisTurn.includes('buy-card');
  const canUpgrade = currentPlayer.resources.iron >= 5 && !currentPlayer.actionsThisTurn.includes('upgrade');
  
  const mainActions: { id: GameAction; label: string; icon: React.ReactNode, disabled?: boolean }[] = [
    { id: 'collect', label: 'Collect', icon: <Gem/>, disabled: !canCollect || lastAction === 'move' || hasMainActionCompleted },
    { id: 'attack', label: 'Attack', icon: <Shield />, disabled: !canAttack || lastAction === 'move' || hasMainActionCompleted },
    { id: 'position', label: 'Position', icon: <Anchor />, disabled: !canPosition || lastAction === 'move' || hasMainActionCompleted },
  ];

  const secondaryActions: { id: GameAction; label: string; icon: React.ReactNode, disabled?: boolean }[] = [
    { id: 'upgrade', label: `Upgrade (${currentPlayer.resources.iron}/5 Iron)`, icon: <Zap />, disabled: !canUpgrade },
    { id: 'buy-card', label: 'Buy Card (10 Gems)', icon: <ShoppingCart />, disabled: !canBuyCard },
    { id: 'deploy', label: `Deploy (${currentPlayer.resources.food}/${currentPlayer.nextArmyCost} Food)`, icon: <Sword />, disabled: !canDeploy },
  ];
  
  const alwaysAvailableActions: { id: GameAction; label: string; icon: React.ReactNode, disabled?: boolean }[] = [
      { id: 'show-cards', label: 'Show Cards', icon: <Album />, disabled: false },
  ]
  
  const timerPercentage = (timeLeft / turnDuration) * 100;

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between p-4">
        <CardTitle className="text-lg">Actions</CardTitle>
        <Button size="sm" onClick={() => onAction('end-turn')} disabled={!isMyTurn} className="relative overflow-hidden">
            <span 
                className="absolute left-0 top-0 h-full bg-primary/50 transition-all duration-1000 ease-linear"
                style={{ width: `${isMyTurn ? 100 - timerPercentage : 0}%` }}
            ></span>
            <span className="relative z-10">End Turn</span>
        </Button>
      </CardHeader>
      <CardContent className="p-4 pt-0">
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
                    <span className="whitespace-normal text-xs">{action.label}</span>
                </Button>
            ))}
             {alwaysAvailableActions.map((action) => (
                <Button
                    key={action.id}
                    variant={currentAction === action.id ? 'default' : 'outline'}
                    onClick={() => onAction(action.id)}
                    disabled={action.disabled}
                    className="flex h-16 flex-col items-center justify-center gap-1 p-2 text-center"
                >
                    {action.icon}
                    <span className="whitespace-normal text-xs">{action.label}</span>
                </Button>
            ))}
        </div>
        <Separator className="my-2" />
        <div className="grid grid-cols-2 flex-wrap gap-2">
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
