
'use client';
import type { GameState, Monster } from '@/lib/types';
import { useState, useEffect } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Card } from '../ui/card';
import { Label } from '../ui/label';
import { Checkbox } from '../ui/checkbox';
import { Slider } from '../ui/slider';
import Image from 'next/image';
import { PLAYER_DATA } from '@/lib/player-data';

type MonsterCombatDialogProps = {
  gameState: GameState;
  monsters: Monster[];
  onRoll: (monster: Monster, useDecideCard: boolean, decidedValue: number, useOvercomeCard: boolean, useWarChief: boolean) => void;
  onClose: () => void;
  onCancel: () => void;
  isAttacker: boolean;
};

export function MonsterCombatDialog({ gameState, monsters, onRoll, onClose, onCancel, isAttacker }: MonsterCombatDialogProps) {
  const { monsterCombatState, players } = gameState;
  const [selectedMonster, setSelectedMonster] = useState<Monster | null>(null);
  const [useDecideCard, setUseDecideCard] = useState(false);
  const [decidedValue, setDecidedValue] = useState(6);
  const [useOvercomeCard, setUseOvercomeCard] = useState(false);
  const [useWarChief, setUseWarChief] = useState(false);

  useEffect(() => {
    if (monsters.length === 1) {
      setSelectedMonster(monsters[0]);
    }
  }, [monsters]);

  if (!monsterCombatState) return null;

  const { attackerId, attackerRolls, monsterRolls, winnerId, phase } = monsterCombatState;
  const attacker = players[attackerId];
  const hasDecideCard = attacker.specialCards.includes('Decide Dice Roll');
  const hasOvercomeCard = attacker.specialCards.includes('Overcome');
  const hasWarChiefCard = attacker.specialCards.includes('War Chief');
  const monsterForDisplay = phase === 'results' ? monsterCombatState.monster : selectedMonster;
  
  const isSelectionPhase = phase === 'rolling' && monsters.length > 1 && !selectedMonster;

  const renderDice = (rolls: number[]) => (
    <div className="flex flex-wrap justify-center gap-2">
      {rolls.map((roll, i) => (
        <div key={i} className="flex h-8 w-8 items-center justify-center rounded-md border text-lg font-bold">
          {roll}
        </div>
      ))}
    </div>
  );

  const getMonsterName = (monster: Monster) => {
    return `${monster.name} (Lvl ${monster.level})`;
  }
  
  const handleAttack = () => {
    if (selectedMonster && isAttacker) {
      onRoll(selectedMonster, useDecideCard, decidedValue, useOvercomeCard, useWarChief);
    }
  };
  
  const renderAttackScreen = () => {
    const attackerSprite = PLAYER_DATA[attacker.color].sprite.attack;
    
    return (
        <>
            <AlertDialogHeader>
                <AlertDialogTitle>Attack {selectedMonster ? getMonsterName(selectedMonster) : 'Monster'}</AlertDialogTitle>
                <AlertDialogDescription>Prepare to fight the monster.</AlertDialogDescription>
            </AlertDialogHeader>
            <div className="flex flex-col justify-around gap-4 py-4 sm:flex-row">
                 <div className="flex flex-col items-center gap-2">
                    <h3 className="font-bold" style={{ color: attacker.color }}>{attacker.name}</h3>
                    <Image src={attackerSprite} alt={`${attacker.name} attacking`} width={64} height={64} />
                    <p className="text-sm font-bold">Attack Power: {attacker.attackPower + 1}</p>
                 </div>

                {selectedMonster && (
                    <div className="flex flex-col items-center gap-2">
                        <h3 className="font-bold capitalize text-destructive">{getMonsterName(selectedMonster)}</h3>
                        <Image src={selectedMonster.sprite.attack} alt={selectedMonster.name} width={64} height={64} className='-scale-x-100'/>
                        <p className="text-sm font-bold">Power: {selectedMonster.level}</p>
                    </div>
                )}
            </div>

            <div className='space-y-4'>
                {hasOvercomeCard && isAttacker && (
                <div className="flex items-center space-x-2 rounded-md border bg-muted/50 p-4">
                    <Checkbox id="use-overcome-card" checked={useOvercomeCard} onCheckedChange={(checked) => { setUseOvercomeCard(!!checked); if(!!checked) setUseDecideCard(false); }} />
                    <Label htmlFor="use-overcome-card" className='font-bold'>Use 'Overcome' card to win automatically?</Label>
                </div>
                )}
                {hasWarChiefCard && isAttacker && (
                    <div className="flex items-center space-x-2 rounded-md border bg-muted/50 p-4">
                        <Checkbox id="use-warchief-card" disabled={useOvercomeCard} checked={useWarChief} onCheckedChange={(checked) => setUseWarChief(!!checked)} />
                        <Label htmlFor="use-warchief-card" className='font-bold'>Use 'War Chief' card for +2 attack power?</Label>
                    </div>
                )}
                {hasDecideCard && isAttacker && (
                <div className="space-y-4 rounded-md border bg-muted/50 p-4">
                    <div className="flex items-center space-x-2">
                        <Checkbox id="use-decide-card" checked={useDecideCard} disabled={useOvercomeCard} onCheckedChange={(checked) => setUseDecideCard(!!checked)} />
                        <Label htmlFor="use-decide-card" className='font-bold'>Use 'Decide Dice Roll' card?</Label>
                    </div>
                    {useDecideCard && (
                        <div className='space-y-2 pt-2'>
                            <div className='flex justify-between'>
                                <Label>Choose Dice Value</Label>
                                <span className='font-bold text-primary'>{decidedValue}</span>
                            </div>
                            <Slider
                                min={1}
                                max={6}
                                step={1}
                                value={[decidedValue]}
                                onValueChange={(value) => setDecidedValue(value[0])}
                                disabled={useOvercomeCard}
                            />
                        </div>
                    )}
                </div>
                )}
            </div>
            <AlertDialogFooter className="mt-4 flex-col-reverse gap-2 sm:flex-row">
                {isAttacker && (
                    <>
                        <AlertDialogCancel onClick={onCancel} className="w-full sm:w-auto">Cancel</AlertDialogCancel>
                        <Button onClick={handleAttack} disabled={!selectedMonster} className="w-full sm:w-auto">
                            Attack {selectedMonster ? getMonsterName(selectedMonster) : 'Monster'}!
                        </Button>
                    </>
                )}
            </AlertDialogFooter>
        </>
    );
};


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
            className={`flex cursor-pointer flex-col items-center gap-2 p-4 transition-all hover:bg-muted ${selectedMonster?.name === monster.name ? 'ring-2 ring-primary' : ''}`}
            onClick={() => setSelectedMonster(monster)}
          >
            <div className='relative h-24 w-24'>
                <Image src={monster.sprite.idle} alt={monster.name} width={96} height={96} />
            </div>
            <div className="text-center">
                <p className="font-bold capitalize">{getMonsterName(monster)}</p>
                <p className="text-sm text-muted-foreground">Power: {monster.level}</p>
            </div>
          </Card>
        ))}
      </div>
       <AlertDialogFooter className="flex-col-reverse gap-2 sm:flex-row">
        {isAttacker && (
            <>
                <AlertDialogCancel onClick={onCancel} className="w-full sm:w-auto">Cancel</AlertDialogCancel>
                <Button onClick={() => { /* This button just closes the selection screen and moves to attack screen */ setSelectedMonster(selectedMonster)}} disabled={!selectedMonster} className="w-full sm:w-auto">
                    Confirm
                </Button>
            </>
        )}
      </AlertDialogFooter>
    </>
  );

  const renderResultsScreen = () => {
    const isPlayerWinner = winnerId === attackerId;
    const attackerSprite = isPlayerWinner ? PLAYER_DATA[attacker.color].sprite.attack : PLAYER_DATA[attacker.color].sprite.death;
    const monsterSprite = isPlayerWinner ? monsterForDisplay?.sprite.death : monsterForDisplay?.sprite.attack;
    
    return (
      <>
        <AlertDialogHeader>
          <AlertDialogTitle>Monster Combat!</AlertDialogTitle>
          {monsterForDisplay && <AlertDialogDescription>
            {attacker.name} fought the {getMonsterName(monsterForDisplay)}!
          </AlertDialogDescription>}
        </AlertDialogHeader>
        
        <div className="flex flex-col justify-around gap-4 sm:flex-row">
          <div className="flex flex-col items-center gap-2">
            <h3 className="font-bold" style={{ color: attacker.color }}>{attacker.name}</h3>
            <Image src={attackerSprite} alt={`${attacker.name} sprite`} width={64} height={64} />
            {renderDice(attackerRolls)}
            <p className="text-xl font-bold">Total: {attackerRolls.reduce((a, b) => a + b, 0)}</p>
          </div>
          {monsterForDisplay && <div className="flex flex-col items-center gap-2">
              <h3 className="font-bold capitalize text-destructive">{getMonsterName(monsterForDisplay)}</h3>
               {monsterSprite && <Image src={monsterSprite} alt={`${monsterForDisplay.name} sprite`} width={64} height={64} />}
              {renderDice(monsterRolls)}
              <p className="text-xl font-bold">Total: {monsterRolls.reduce((a, b) => a + b, 0)}</p>
          </div>}
        </div>

        <div className="mt-4 text-center">
          <h2 className="text-2xl font-bold">
            {isPlayerWinner && winnerId !== null ? (
                <span style={{ color: players[winnerId].color }}>{players[winnerId].name} wins!</span>
            ) : (
                <span className='text-destructive'>The Monster wins!</span>
            )}
          </h2>
        </div>

        <AlertDialogFooter>
            {isAttacker && (
                <AlertDialogAction onClick={onClose} className="w-full">
                    Continue
                </AlertDialogAction>
            )}
        </AlertDialogFooter>
      </>
    );
  }

  const renderContent = () => {
    if (phase === 'results') {
      return renderResultsScreen();
    }
    if (isSelectionPhase) {
      return renderSelectionScreen();
    }
    return renderAttackScreen();
  }

  return (
    <AlertDialog open={true}>
      <AlertDialogContent>
        {renderContent()}
      </AlertDialogContent>
    </AlertDialog>
  );
}
