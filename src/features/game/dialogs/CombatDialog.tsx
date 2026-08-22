
'use client';
import type { GameState } from '@/lib/types';
import { CardName, GameAction } from '@/lib/types';
import { useState, useEffect } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import Image from 'next/image';
import { PLAYER_DATA } from '@/lib/player-data';
import { Loader2 } from 'lucide-react';

type CombatDialogProps = {
  gameState: GameState;
  onRoll: (payload: { useWarChief: boolean; useOvercome: boolean }) => void;
  onClose: () => void;
  isMyTurn: boolean;
  localPlayerId: number;
};

export function CombatDialog({ gameState, onRoll, onClose, isMyTurn, localPlayerId }: CombatDialogProps) {
  const [selectedCard, setSelectedCombatCard] = useState<'none' | 'overcome' | 'warchief'>('none');
  const [isRolling, setIsRolling] = useState(false);
  const { combatState, players } = gameState;

  if (!combatState) return null;
  
  const isAttacker = localPlayerId === combatState?.attackerId;

  const { attackerId, defenderId, attackerRolls, defenderRolls, winnerId, phase } = combatState;
  const attacker = players[attackerId];
  const defender = players.find(p => p.id === defenderId);

  if (!defender) return null;
  
  const hasWarChiefCard = attacker.specialCards.includes(CardName.WarChief);
  const hasOvercomeCard = attacker.specialCards.includes(CardName.Overcome);
  const isCombatOver = phase === 'results';
  const loserId = isCombatOver && winnerId !== null ? (winnerId === attackerId ? defenderId : attackerId) : null;
  
  const attackerSprite = isCombatOver && loserId === attackerId ? PLAYER_DATA[attacker.color].sprite.death : PLAYER_DATA[attacker.color].sprite.attack;
  const defenderSprite = isCombatOver && loserId === defenderId ? PLAYER_DATA[defender.color].sprite.death : PLAYER_DATA[defender.color].sprite.attack;

  const renderDice = (rolls: number[]) => (
    <div className="flex flex-wrap justify-center gap-2">
      {rolls.map((roll, i) => (
        <div key={i} className="flex h-8 w-8 items-center justify-center rounded-md border text-lg font-bold">
          {roll}
        </div>
      ))}
    </div>
  );
  
  const canPerformAction = isMyTurn && isAttacker;
  const isViewer = !isAttacker;
  const canUseCard = !attacker.actionsThisTurn.includes(GameAction.UseCard);

  const handleRollClick = () => {
    setIsRolling(true);
    onRoll({ 
      useWarChief: selectedCard === 'warchief', 
      useOvercome: selectedCard === 'overcome' 
    });
  };

  // Viewer-only results screen
  if (phase === 'results' && isViewer) {
    return (
      <AlertDialog open={true}>
        <AlertDialogContent>
           <AlertDialogHeader>
            <AlertDialogTitle>Combat Results</AlertDialogTitle>
            <AlertDialogDescription>
              {attacker.name} is attacking {defender.name}!
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex flex-col justify-around gap-4 sm:flex-row">
            <div className="flex flex-col items-center gap-2">
                <h3 className="font-bold" style={{ color: attacker.color }}>{attacker.name}</h3>
                <Image src={attackerSprite} alt={`${attacker.name} sprite`} width={64} height={64} unoptimized />
                {renderDice(attackerRolls)}
                <p className="text-xl font-bold">Total: {attackerRolls.reduce((a, b) => a + b, 0)}</p>
            </div>
            <div className="flex flex-col items-center gap-2">
                <h3 className="font-bold" style={{ color: defender.color }}>{defender.name}</h3>
                <Image src={defenderSprite} alt={`${defender.name} sprite`} width={64} height={64} className="-scale-x-100" unoptimized />
                {renderDice(defenderRolls)}
                <p className="text-xl font-bold">Total: {defenderRolls.reduce((a, b) => a + b, 0)}</p>
            </div>
        </div>
         <div className="mt-4 text-center">
            <h2 className="text-2xl font-bold">
              {winnerId !== null ? <span style={{ color: players[winnerId!].color }}>{players[winnerId!].name}</span> : 'Nobody'}{' '}wins!
            </h2>
          </div>
           <AlertDialogFooter>
             <Button variant="outline" onClick={onClose}>Close</Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  // Interactive dialog for the attacker
  return (
    <AlertDialog open={true}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Combat!</AlertDialogTitle>
          <AlertDialogDescription>
            {attacker.name} is attacking {defender.name}!
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        {phase === 'rolling' && canPerformAction && canUseCard && (hasOvercomeCard || hasWarChiefCard) && (
          <div className="rounded-md border bg-muted/50 p-4 space-y-3">
            <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Select Combat Card</Label>
            <RadioGroup value={selectedCard} onValueChange={(val) => setSelectedCombatCard(val as any)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="none" id="combat-card-none" />
                <Label htmlFor="combat-card-none" className="cursor-pointer font-medium">None (Standard Roll)</Label>
              </div>
              {hasOvercomeCard && (
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="overcome" id="combat-card-overcome" />
                  <Label htmlFor="combat-card-overcome" className="cursor-pointer font-medium">
                    Use '{CardName.Overcome}' (Auto-win combat)
                  </Label>
                </div>
              )}
              {hasWarChiefCard && (
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="warchief" id="combat-card-warchief" />
                  <Label htmlFor="combat-card-warchief" className="cursor-pointer font-medium">
                    Use '{CardName.WarChief}' (+2 Attack Power / +2 Dice)
                  </Label>
                </div>
              )}
            </RadioGroup>
          </div>
        )}

        <div className="flex flex-col justify-around gap-4 sm:flex-row">
            <div className="flex flex-col items-center gap-2">
                <h3 className="font-bold" style={{ color: attacker.color }}>{attacker.name}</h3>
                {isCombatOver ? (
                  <>
                    <Image src={attackerSprite} alt={`${attacker.name} sprite`} width={64} height={64} unoptimized />
                    {renderDice(attackerRolls)}
                    <p className="text-xl font-bold">Total: {attackerRolls.reduce((a, b) => a + b, 0)}</p>
                  </>
                ) : (
                   <Image src={attackerSprite} alt={`${attacker.name} sprite`} width={64} height={64} unoptimized />
                )}
            </div>
            <div className="flex flex-col items-center gap-2">
                <h3 className="font-bold" style={{ color: defender.color }}>{defender.name}</h3>
                {isCombatOver ? (
                  <>
                    <Image src={defenderSprite} alt={`${defender.name} sprite`} width={64} height={64} className="-scale-x-100" unoptimized />
                    {renderDice(defenderRolls)}
                    <p className="text-xl font-bold">Total: {defenderRolls.reduce((a, b) => a + b, 0)}</p>
                  </>
                ) : (
                    <Image src={defenderSprite} alt={`${defender.name} sprite`} width={64} height={64} className="-scale-x-100" unoptimized />
                )}
            </div>
        </div>

        {phase === 'results' && winnerId !== null && (
          <div className="mt-4 text-center">
            <h2 className="text-2xl font-bold">
              <span style={{ color: players[winnerId].color }}>{players[winnerId].name}</span> wins!
            </h2>
          </div>
        )}

        {canPerformAction && (
          <AlertDialogFooter>
            {phase === 'rolling' && (
              <Button onClick={handleRollClick} disabled={isRolling} className="w-full">
                {isRolling && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Roll Dice!
              </Button>
            )}
            {phase === 'results' && (
              <AlertDialogAction onClick={onClose} className="w-full">
                Continue
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        )}
      </AlertDialogContent>
    </AlertDialog>
  );
}
