
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
import { Checkbox } from '@/components/ui/checkbox';
import Image from 'next/image';
import { PLAYER_DATA } from '@/lib/player-data';

type CombatDialogProps = {
  gameState: GameState;
  onRoll: (useWarChief: boolean) => void;
  onClose: () => void;
  isMyTurn: boolean;
  localPlayerId: number;
};

export function CombatDialog({ gameState, onRoll, onClose, isMyTurn, localPlayerId }: CombatDialogProps) {
  const [useWarChief, setUseWarChief] = useState(false);
  const { combatState, players } = gameState;

  if (!combatState) return null;
  
  const isAttacker = localPlayerId === combatState?.attackerId;

  useEffect(() => {
    if (combatState?.phase === 'results' && !isAttacker) {
        const timer = setTimeout(() => {
            onClose();
        }, 5000);
        return () => clearTimeout(timer);
    }
  }, [combatState?.phase, isAttacker, onClose]);


  const { attackerId, defenderId, attackerRolls, defenderRolls, winnerId, phase } = combatState;
  const attacker = players[attackerId];
  const defender = players.find(p => p.id === defenderId);

  if (!defender) return null;
  
  const hasWarChiefCard = attacker.specialCards.includes(CardName.WarChief);
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
        
        {phase === 'rolling' && hasWarChiefCard && canPerformAction && canUseCard && (
            <div className="flex items-center space-x-2 rounded-md border bg-muted/50 p-4">
                <Checkbox id="use-warchief-card" checked={useWarChief} onCheckedChange={(checked) => setUseWarChief(!!checked)} />
                <Label htmlFor="use-warchief-card" className='font-bold'>Use '{CardName.WarChief}' card for +2 attack power?</Label>
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

        <AlertDialogFooter>
          {phase === 'rolling' && canPerformAction && (
            <Button onClick={() => onRoll(useWarChief)} className="w-full">
              Roll Dice!
            </Button>
          )}
          {phase === 'results' && canPerformAction && (
            <AlertDialogAction onClick={onClose} className="w-full">
              Continue
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
