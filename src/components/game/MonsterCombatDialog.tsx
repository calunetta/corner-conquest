'use client';
import type { GameState, Monster } from '@/lib/types';
import { useState } from 'react';
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
import { MonsterIcon } from '../icons';
import { Card } from '../ui/card';

type MonsterCombatDialogProps = {
  gameState: GameState;
  monsters: Monster[];
  onRoll: (monster: Monster) => void;
  onClose: () => void;
};

export function MonsterCombatDialog({ gameState, monsters, onRoll, onClose }: MonsterCombatDialogProps) {
  const { monsterCombatState, players } = gameState;
  const [selectedMonster, setSelectedMonster] = useState<Monster | null>(null);

  if (!monsterCombatState) return null;

  const { attackerId, attackerRolls, monsterRolls, winnerId, phase } = monsterCombatState;
  const attacker = players[attackerId];
  const monsterForDisplay = phase === 'results' ? monsterCombatState.monster : selectedMonster;

  const renderDice = (rolls: number[]) => (
    <div className="flex gap-2">
      {rolls.map((roll, i) => (
        <div key={i} className="flex h-8 w-8 items-center justify-center rounded-md border text-lg font-bold">
          {roll}
        </div>
      ))}
    </div>
  );

  const getMonsterName = (monster: Monster) => {
    return `${monster.type} ${monster.id} Monster (Lvl ${monster.level})`;
  }

  const renderSelectionScreen = () => (
    <>
      <AlertDialogHeader>
        <AlertDialogTitle>Choose a Monster to Attack</AlertDialogTitle>
        <AlertDialogDescription>Select which monster you want to fight on this island.</AlertDialogDescription>
      </AlertDialogHeader>
      <div className="grid grid-cols-2 gap-4 py-4">
        {monsters.map((monster, i) => (
          <Card 
            key={i} 
            className="flex cursor-pointer flex-col items-center gap-2 p-4 transition-all hover:bg-muted"
            onClick={() => setSelectedMonster(monster)}
          >
            <MonsterIcon level={monster.level} className="h-12 w-12" />
            <div className="text-center">
                <p className="font-bold capitalize">{getMonsterName(monster)}</p>
                <p className="text-sm text-muted-foreground">Power: {monster.level}</p>
            </div>
          </Card>
        ))}
      </div>
       <AlertDialogFooter>
          <Button onClick={() => onRoll(selectedMonster!)} disabled={!selectedMonster}>
            Attack {selectedMonster ? getMonsterName(selectedMonster) : 'Monster'}!
          </Button>
      </AlertDialogFooter>
    </>
  );

  const renderResultsScreen = () => (
    <>
      <AlertDialogHeader>
        <AlertDialogTitle>Monster Combat!</AlertDialogTitle>
        {monsterForDisplay && <AlertDialogDescription>
          {attacker.name} is attacking the {getMonsterName(monsterForDisplay)}!
        </AlertDialogDescription>}
      </AlertDialogHeader>
      
      <div className="flex justify-around gap-4">
        <div className="flex flex-col items-center gap-2">
          <h3 className="font-bold" style={{ color: attacker.color }}>{attacker.name}</h3>
          {phase === 'results' && renderDice(attackerRolls)}
          {phase === 'results' && <p className="text-xl font-bold">Total: {attackerRolls.reduce((a, b) => a + b, 0)}</p>}
        </div>
        {monsterForDisplay && <div className="flex flex-col items-center gap-2">
            <h3 className="font-bold capitalize text-destructive">{getMonsterName(monsterForDisplay)}</h3>
            {phase === 'results' && renderDice(monsterRolls)}
            {phase === 'results' && <p className="text-xl font-bold">Total: {monsterRolls.reduce((a, b) => a + b, 0)}</p>}
        </div>}
      </div>

      {phase === 'results' && (
        <div className="mt-4 text-center">
          <h2 className="text-2xl font-bold">
            {winnerId !== null ? (
                <span style={{ color: players[winnerId].color }}>{players[winnerId].name} wins!</span>
            ) : (
                <span className='text-destructive'>The Monster wins!</span>
            )}
          </h2>
        </div>
      )}

      <AlertDialogFooter>
        {phase === 'results' && (
          <AlertDialogAction onClick={onClose} className="w-full">
            Continue
          </AlertDialogAction>
        )}
      </AlertDialogFooter>
    </>
  );


  return (
    <AlertDialog open={true}>
      <AlertDialogContent>
        {phase === 'rolling' ? renderSelectionScreen() : renderResultsScreen()}
      </AlertDialogContent>
    </AlertDialog>
  );
}
