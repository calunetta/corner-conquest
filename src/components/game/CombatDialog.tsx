'use client';
import type { GameState } from '@/lib/types';
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

type CombatDialogProps = {
  gameState: GameState;
  onRoll: () => void;
  onClose: () => void;
};

export function CombatDialog({ gameState, onRoll, onClose }: CombatDialogProps) {
  const { combatState, players } = gameState;

  if (!combatState) return null;

  const { attackerId, defenderId, attackerRolls, defenderRolls, winnerId, phase } = combatState;
  const attacker = players[attackerId];
  const defender = players[defenderId];

  const renderDice = (rolls: number[]) => (
    <div className="flex flex-wrap justify-center gap-2">
      {rolls.map((roll, i) => (
        <div key={i} className="flex h-8 w-8 items-center justify-center rounded-md border text-lg font-bold">
          {roll}
        </div>
      ))}
    </div>
  );

  return (
    <AlertDialog open={true}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Combat!</AlertDialogTitle>
          <AlertDialogDescription>
            {attacker.name} is attacking {defender.name}!
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <div className="flex flex-col justify-around gap-4 sm:flex-row">
          <div className="flex flex-col items-center gap-2">
            <h3 className="font-bold" style={{ color: attacker.color }}>{attacker.name}</h3>
            {phase === 'results' && renderDice(attackerRolls)}
            {phase === 'results' && <p className="text-xl font-bold">Total: {attackerRolls.reduce((a, b) => a + b, 0)}</p>}
          </div>
          <div className="flex flex-col items-center gap-2">
            <h3 className="font-bold" style={{ color: defender.color }}>{defender.name}</h3>
            {phase === 'results' && renderDice(defenderRolls)}
            {phase === 'results' && <p className="text-xl font-bold">Total: {defenderRolls.reduce((a, b) => a + b, 0)}</p>}
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
          {phase === 'rolling' && (
            <Button onClick={onRoll} className="w-full">
              Roll Dice!
            </Button>
          )}
          {phase === 'results' && (
            <AlertDialogAction onClick={onClose} className="w-full">
              Continue
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
