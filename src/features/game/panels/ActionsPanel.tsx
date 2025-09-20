
'use client';
import type { GameState, Player, Army } from '@/lib/types';
import { GameAction } from '@/lib/enums';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, Sword, ShoppingCart, Gem, Anchor, Zap, Album, University, XCircle } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { usePlayer } from '@/hooks/use-player';

type ActionsPanelProps = {
  onAction: (action: GameAction, payload?: any) => void;
  gameState: GameState;
  isMyTurn: boolean;
  timeLeft: number;
  turnDuration: number;
  currentAction: GameAction | null;
  selectedArmy: Army | null;
  onToggleCards: (playerId: number) => void;
  cardsDialogPlayerId: number | null;
};

type ActionConfig = {
  id: GameAction;
  label: string;
  icon: React.ReactNode;
  disabled?: boolean;
  tooltip: string;
  onClick: () => void;
};

export function ActionsPanel({ onAction, gameState, isMyTurn, timeLeft, turnDuration, currentAction, selectedArmy, onToggleCards, cardsDialogPlayerId }: ActionsPanelProps) {
  const { playerId } = usePlayer();
  const { currentPlayerIndex, players, map, specialCardsDeck, teleportState, scoutingState, settings, abilitiesShopState } = gameState;
  const currentPlayer = players[currentPlayerIndex];
  const localPlayer = players.find(p => p.playerId === playerId)!;
  
  const currentTile = (selectedArmy && map && map[selectedArmy.position.y] && map[selectedArmy.position.y][selectedArmy.position.x])
    ? map[selectedArmy.position.y][selectedArmy.position.x] 
    : null;

  const hasArmyActed = !!selectedArmy?.hasActed;

  const canCollect = selectedArmy && currentPlayer.positions.some(p => p.armyId === selectedArmy.id);
  const canPosition = selectedArmy && currentTile && (currentTile.type === 'resource' || currentTile.type === 'base') && currentTile.resources.length > 0 && !currentPlayer.positions.some(p => p.armyId === selectedArmy.id) && (!currentTile.monsters || currentTile.monsters.length === 0);
  const canAttack = selectedArmy && currentTile && (currentTile.occupants.some(o => o.playerId !== currentPlayer.id) || (currentTile.type === 'monster' && !!currentTile.monsters && currentTile.monsters.length > 0));
  
  const upgradeCost = currentPlayer.masterBuilderActive ? Math.ceil(settings.upgradeCost / 2) : settings.upgradeCost;
  const deployCost = currentPlayer.efficientActive ? Math.ceil(currentPlayer.nextArmyCost / 2) : currentPlayer.nextArmyCost;

  const canDeploy = (currentPlayer.resources.food >= deployCost || currentPlayer.reinforceActive) && currentPlayer.armyCount < 5 && !currentPlayer.actionsThisTurn.includes(GameAction.Deploy);
  const canBuyCard = currentPlayer.resources.gems >= 10 && specialCardsDeck.length > 0 && !currentPlayer.actionsThisTurn.includes(GameAction.BuyCard);
  const canUpgrade = currentPlayer.resources.iron >= upgradeCost && !currentPlayer.actionsThisTurn.includes(GameAction.Upgrade) && currentPlayer.attackPower < 4;
  
  const isCancellableActionInProgress = !!teleportState || (!!scoutingState && scoutingState.count > 0) || currentPlayer.hasExtraMove;

  const mainActions: ActionConfig[] = [
    { id: GameAction.Collect, label: 'Collect', icon: <Gem/>, disabled: !canCollect || hasArmyActed, tooltip: "Collect resources from an island where you have a positioned army. Can only be done once per turn, before moving.", onClick: () => onAction(GameAction.Collect, null) },
    { id: GameAction.Attack, label: 'Attack', icon: <Shield />, disabled: !canAttack || hasArmyActed, tooltip: "Attack another player's army or a monster on the same island. Can only be done once per turn, before moving.", onClick: () => onAction(GameAction.Attack, null) },
    { id: GameAction.Position, label: 'Position', icon: <Anchor />, disabled: !canPosition || hasArmyActed, tooltip: "Position your army on a resource to position on. Can only be done once per turn, before moving.", onClick: () => onAction(GameAction.Position, null) },
  ];
  
  const deployLabel = currentPlayer.reinforceActive
    ? 'Deploy'
    : `Deploy (${currentPlayer.resources.food}/${deployCost} Food)`;

  const buyCardLabel = `Buy Card`;

  const secondaryActions: ActionConfig[] = [
    { 
      id: GameAction.Upgrade, 
      label: `Upgrade (${currentPlayer.resources.iron}/${upgradeCost} Iron)`, 
      icon: <Zap />, 
      disabled: !canUpgrade, 
      tooltip: "Spend iron to permanently increase your army's attack power by 1. Can only be done once per turn.",
      onClick: () => onAction(GameAction.Upgrade, null)
    },
    { 
      id: GameAction.BuyCard, 
      label: buyCardLabel, 
      icon: <ShoppingCart />, 
      disabled: !canBuyCard, 
      tooltip: "Spend 10 gems to draw a random special card from the deck. Can only be done once per turn.",
      onClick: () => onAction(GameAction.BuyCard, null)
    },
    { 
      id: GameAction.Deploy, 
      label: deployLabel, 
      icon: <Sword />, 
      disabled: !canDeploy, 
      tooltip: "Spend food to deploy a new army at your base. The cost increases with each new army.",
      onClick: () => onAction(GameAction.Deploy, null)
    },
    { 
      id: GameAction.OpenAbilitiesShop, 
      label: 'Abilities Shop', 
      icon: <University />, 
      disabled: false, 
      tooltip: "Purchase permanent passive abilities for your empire.",
      onClick: () => {
          const action: GameAction = abilitiesShopState?.isOpen ? GameAction.CloseAbilitiesShop : GameAction.OpenAbilitiesShop;
          onAction(action, null);
      }
    },
  ];
  
  const alwaysAvailableActions: ActionConfig[] = [
      { 
        id: GameAction.ShowCards, 
        label: 'My Cards', 
        icon: <Album />, 
        disabled: localPlayer.specialCards.length === 0, 
        tooltip: "View your collected special cards. You can use one per turn.", 
        onClick: () => onToggleCards(localPlayer.id)
      },
  ]
  
  const timerPercentage = (timeLeft / turnDuration) * 100;

  const getDisabledReason = (actionId: GameAction): string => {
    switch (actionId) {
        case GameAction.Upgrade:
            if (currentPlayer.attackPower >= 4) return "Maximum attack power reached.";
            if (currentPlayer.resources.iron < upgradeCost) return "Not enough iron.";
            if (currentPlayer.actionsThisTurn.includes(GameAction.Upgrade)) return "You've already upgraded this turn.";
            return "This action is not available.";
        case GameAction.BuyCard:
            if (currentPlayer.resources.gems < 10) return "Not enough gems.";
            if (specialCardsDeck.length === 0) return "No cards left in the deck.";
            if (currentPlayer.actionsThisTurn.includes(GameAction.BuyCard)) return "You've already bought a card this turn.";
            return "This action is not available.";
        case GameAction.Deploy:
            if (!currentPlayer.reinforceActive && currentPlayer.resources.food < deployCost) return "Not enough food.";
            if (currentPlayer.armyCount >= 5) return "Maximum army size reached.";
            if (currentPlayer.actionsThisTurn.includes(GameAction.Deploy)) return "You've already deployed this turn.";
            return "This action is not available.";
        case GameAction.Collect:
            if (!selectedArmy) return "You must select an army first.";
            if (!currentPlayer.positions.some(p => p.armyId === selectedArmy?.id)) return "Your selected army is not positioned on a resource.";
            return "This action is not available.";
        case GameAction.Attack:
            if (!selectedArmy) return "You must select an army first.";
            if (!currentTile || (!currentTile.occupants.some(o => o.playerId !== currentPlayer.id) && (!currentTile.monsters || currentTile.monsters.length === 0))) return "There is nothing to attack on this tile.";
            return "This action is not available.";
        case GameAction.Position:
            if (!selectedArmy) return "You must select an army first.";
            if (currentPlayer.positions.some(p => p.armyId === selectedArmy?.id)) return "You are already positioned here.";
            if (!currentTile || (currentTile.type !== 'resource' && currentTile.type !== 'base') || currentTile.resources.length === 0) return "This tile has no resources to position on.";
            if (currentTile.monsters && currentTile.monsters.length > 0) return "Cannot position on an island with monsters.";
            return "This action is not available.";
        case GameAction.ShowCards:
            if (localPlayer.specialCards.length === 0) return "You have no special cards.";
            return "This action is not available.";
        default:
            return "This action is not available.";
    }
  };

  const renderButton = (action: ActionConfig, isMain: boolean) => (
    <TooltipProvider key={action.id}>
        <Tooltip>
            <TooltipTrigger asChild>
                <div className={isMain ? "w-full" : ""}>
                    <Button
                        variant={currentAction === action.id || (action.id === GameAction.ShowCards && cardsDialogPlayerId === localPlayer.id) ? 'default' : 'outline'}
                        onClick={action.onClick}
                        disabled={action.id !== GameAction.ShowCards && (!isMyTurn || action.disabled)}
                        className={`flex h-auto min-h-12 w-full flex-col items-center justify-center gap-1 p-2 text-center ${isMain ? 'h-16 text-xs' : 'text-xs sm:flex-row sm:text-sm'}`}
                    >
                        {action.icon}
                        <span className="whitespace-normal">{action.label}</span>
                    </Button>
                </div>
            </TooltipTrigger>
            <TooltipContent>
                <p>{action.tooltip}</p>
                 {(action.disabled && (isMyTurn || action.id === GameAction.ShowCards)) && <p className="mt-1 text-xs text-destructive">
                    {hasArmyActed && [GameAction.Collect, GameAction.Attack, GameAction.Position].includes(action.id) ? "This army has already acted." : getDisabledReason(action.id)}
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
                 <Button variant="destructive" size="sm" onClick={() => onAction(GameAction.CancelAction, null)} disabled={!isMyTurn}>
                    <XCircle />
                    Cancel
                </Button>
            )}
            {selectedArmy && isMyTurn && (
                 <Button variant="secondary" size="sm" onClick={() => onAction(GameAction.DeselectArmy, null)}>
                    <XCircle className="mr-2 h-4 w-4" />
                    Deselect Army
                </Button>
            )}
            <Button size="sm" onClick={() => onAction(GameAction.EndTurn, null)} disabled={!isMyTurn} className="relative overflow-hidden">
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
