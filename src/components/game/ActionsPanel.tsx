


'use client';
import type { GameAction, GameState } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, Sword, ShoppingCart, Gem, Anchor, Zap, Album, University, XCircle } from 'lucide-react';
import { Separator } from '../ui/separator';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '../ui/tooltip';

type ActionsPanelProps = {
  onAction: (action: GameAction) => void;
  gameState: GameState;
  isMyTurn: boolean;
  timeLeft: number;
  turnDuration: number;
};

type ActionConfig = {
  id: GameAction;
  label: string;
  icon: React.ReactNode;
  disabled?: boolean;
  tooltip: string;
};

export function ActionsPanel({ onAction, gameState, isMyTurn, timeLeft, turnDuration }: ActionsPanelProps) {
  const { currentPlayerIndex, players, map, currentAction, specialCardsDeck, selectedArmyId, teleportState, scoutingState, settings } = gameState;
  const currentPlayer = players[currentPlayerIndex];
  
  const selectedArmy = selectedArmyId !== null ? currentPlayer.armies.find(a => a.id === selectedArmyId) : null;
  const currentTile = selectedArmy ? map[selectedArmy.position.y][selectedArmy.position.x] : null;

  const hasArmyActed = !!selectedArmy?.hasActed;

  const canCollect = selectedArmy && currentPlayer.positions.some(p => p.armyId === selectedArmy.id);
  const canPosition = selectedArmy && currentTile && (currentTile.type === 'resource' || currentTile.type === 'base') && currentTile.resources.length > 0 && !currentPlayer.positions.some(p => p.armyId === selectedArmy.id);
  const canAttack = selectedArmy && currentTile && (currentTile.occupants.some(o => o.playerId !== currentPlayer.id) || (currentTile.type === 'monster' && !!currentTile.monsters && currentTile.monsters.length > 0));
  
  const upgradeCost = currentPlayer.masterBuilderActive ? Math.ceil(settings.upgradeCost / 2) : settings.upgradeCost;
  const deployCost = currentPlayer.efficientActive ? Math.ceil(currentPlayer.nextArmyCost / 2) : currentPlayer.nextArmyCost;

  const canDeploy = (currentPlayer.resources.food >= deployCost || currentPlayer.reinforceActive) && currentPlayer.armyCount < 5 && !currentPlayer.actionsThisTurn.includes('deploy');
  const canBuyCard = currentPlayer.resources.gems >= 10 && specialCardsDeck.length > 0 && !currentPlayer.actionsThisTurn.includes('buy-card');
  const canUpgrade = currentPlayer.resources.iron >= upgradeCost && !currentPlayer.actionsThisTurn.includes('upgrade') && currentPlayer.attackPower < 4;
  
  const isCancellableActionInProgress = !!teleportState || (!!scoutingState && scoutingState.count > 0) || currentPlayer.hasExtraMove;

  const mainActions: ActionConfig[] = [
    { id: 'collect', label: 'Collect', icon: <Gem/>, disabled: !canCollect || hasArmyActed, tooltip: "Collect resources from an island where you have a positioned army. Can only be done once per turn, before moving." },
    { id: 'attack', label: 'Attack', icon: <Shield />, disabled: !canAttack || hasArmyActed, tooltip: "Attack another player's army or a monster on the same island. Can only be done once per turn, before moving." },
    { id: 'position', label: 'Position', icon: <Anchor />, disabled: !canPosition || hasArmyActed, tooltip: "Position your army on a resource to collect it on a future turn. Can only be done once per turn, before moving." },
  ];
  
  const deployLabel = currentPlayer.reinforceActive
    ? 'Deploy'
    : `Deploy (${currentPlayer.resources.food}/${deployCost} Food)`;

  const buyCardLabel = `Buy Card`;

  const secondaryActions: ActionConfig[] = [
    { id: 'upgrade', label: `Upgrade (${currentPlayer.resources.iron}/${upgradeCost} Iron)`, icon: <Zap />, disabled: !canUpgrade, tooltip: "Spend iron to permanently increase your army's attack power by 1. Can only be done once per turn." },
    { id: 'buy-card', label: buyCardLabel, icon: <ShoppingCart />, disabled: !canBuyCard, tooltip: "Spend 10 gems to draw a random special card from the deck. Can only be done once per turn." },
    { id: 'deploy', label: deployLabel, icon: <Sword />, disabled: !canDeploy, tooltip: "Spend food to deploy a new army at your base. The cost increases with each new army." },
    { id: 'open-abilities-shop', label: 'Abilities Shop', icon: <University />, disabled: false, tooltip: "Purchase permanent passive abilities for your empire." },
  ];
  
  const alwaysAvailableActions: ActionConfig[] = [
      { id: 'show-cards', label: 'Show Cards', icon: <Album />, disabled: currentPlayer.specialCards.length === 0, tooltip: "View your collected special cards. You can use one per turn." },
  ]
  
  const timerPercentage = (timeLeft / turnDuration) * 100;

  const getDisabledReason = (actionId: GameAction): string => {
    switch (actionId) {
        case 'upgrade':
            if (currentPlayer.attackPower >= 4) return "Maximum attack power reached.";
            if (currentPlayer.resources.iron < upgradeCost) return "Not enough iron.";
            if (currentPlayer.actionsThisTurn.includes('upgrade')) return "You've already upgraded this turn.";
            break;
        case 'buy-card':
            if (currentPlayer.resources.gems < 10) return "Not enough gems.";
            if (specialCardsDeck.length === 0) return "No cards left in the deck.";
            if (currentPlayer.actionsThisTurn.includes('buy-card')) return "You've already bought a card this turn.";
            break;
        case 'deploy':
            if (!currentPlayer.reinforceActive && currentPlayer.resources.food < deployCost) return "Not enough food.";
            if (currentPlayer.armyCount >= 5) return "Maximum army size reached.";
            if (currentPlayer.actionsThisTurn.includes('deploy')) return "You've already deployed this turn.";
            break;
        case 'collect':
            if (!selectedArmy) return "You must select an army first.";
            if (!currentPlayer.positions.some(p => p.armyId === selectedArmy.id)) return "Your selected army is not positioned on a resource.";
            break;
        case 'attack':
            if (!selectedArmy) return "You must select an army first.";
            if (!currentTile || (!currentTile.occupants.some(o => o.playerId !== currentPlayer.id) && (!currentTile.monsters || currentTile.monsters.length === 0))) return "There is nothing to attack on this tile.";
            break;
        case 'position':
            if (!selectedArmy) return "You must select an army first.";
            if (!currentTile || (currentTile.type !== 'resource' && currentTile.type !== 'base') || currentTile.resources.length === 0) return "This tile has no resources to position on.";
            if (currentPlayer.positions.some(p => p.armyId === selectedArmy.id)) return "You are already positioned here.";
            break;
        case 'show-cards':
            if (currentPlayer.specialCards.length === 0) return "You have no special cards.";
            break;
        default:
            return "This action is not available.";
    }
    return "This action is not available.";
  };

  const renderButton = (action: ActionConfig, isMain: boolean) => (
    <TooltipProvider key={action.id}>
        <Tooltip>
            <TooltipTrigger asChild>
                <div className={isMain ? "w-full" : ""}>
                    <Button
                        variant={currentAction === action.id ? 'default' : 'outline'}
                        onClick={() => onAction(action.id)}
                        disabled={!isMyTurn || action.disabled}
                        className={`flex h-auto min-h-12 w-full flex-col items-center justify-center gap-1 p-2 text-center ${isMain ? 'h-16 text-xs' : 'text-xs sm:flex-row sm:text-sm'}`}
                    >
                        {action.icon}
                        <span className="whitespace-normal">{action.label}</span>
                    </Button>
                </div>
            </TooltipTrigger>
            <TooltipContent>
                <p>{action.tooltip}</p>
                 {(action.disabled && isMyTurn) && <p className="mt-1 text-xs text-destructive">
                    {hasArmyActed && ['collect', 'attack', 'position'].includes(action.id) ? "This army has already acted." : getDisabledReason(action.id)}
                </p>}
            </TooltipContent>
        </Tooltip>
    </TooltipProvider>
  );

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between p-4">
        <CardTitle className="text-lg">Actions</CardTitle>
        <div className="flex items-center gap-2">
            {isCancellableActionInProgress && (
                 <Button variant="destructive" size="sm" onClick={() => onAction('cancel-action')} disabled={!isMyTurn}>
                    <XCircle />
                    Cancel
                </Button>
            )}
            <Button size="sm" onClick={() => onAction('end-turn')} disabled={!isMyTurn} className="relative overflow-hidden">
                <span 
                    className="absolute left-0 top-0 h-full bg-primary/50 transition-all duration-1000 ease-linear"
                    style={{ width: `${isMyTurn ? timerPercentage : 100}%` }}
                ></span>
                <span className="relative z-10">End Turn</span>
            </Button>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <div className="grid grid-cols-2 grid-rows-2 gap-2">
            {mainActions.map((action) => renderButton(action, true))}
            {alwaysAvailableActions.map((action) => renderButton(action, true))}
        </div>
        <Separator className="my-2" />
        <div className="grid grid-cols-2 flex-wrap gap-2">
            {secondaryActions.map((action) => renderButton(action, false))}
        </div>
        <div className='text-center mt-2 text-sm text-muted-foreground'>
            Cards in deck: {specialCardsDeck.length}
        </div>
      </CardContent>
    </Card>
  );
}
