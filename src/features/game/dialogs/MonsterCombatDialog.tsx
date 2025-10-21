
'use client';
import type { GameState, Monster } from '@/lib/types';
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
import { Slider } from '@/components/ui/slider';
import Image from 'next/image';
import { PLAYER_DATA } from '@/lib/player-data';

type MonsterCombatDialogProps = {
  gameState: GameState;
  onRoll: (payload: { monster: Monster; useDecideCard: boolean; decidedValue: number; useOvercomeCard: boolean; useWarChief: boolean }) => void;
  onClose: () => void;
  onCancel: (payload?: { cardName?: CardName }) => void;
};

export function MonsterCombatDialog({ gameState, onRoll, onClose, onCancel }: MonsterCombatDialogProps) {
  const { monsterCombatState, players, map } = gameState;
  if (!monsterCombatState) return null;

  const { attackerId, attackerRolls, monsterRolls, winnerId, phase } = monsterCombatState;
  const attacker = players[attackerId];
  const monsterForDisplay = monsterCombatState.monster;

  const [useDecideCard, setUseDecideCard] = useState(false);
  const [decidedValue, setDecidedValue] = useState(6);
  const [useOvercomeCard, setUseOvercomeCard] = useState(false);
  const [useWarChief, setUseWarChief] = useState(false);

  const hasDecideCard = attacker.specialCards.includes(CardName.DecideDiceRoll);
  const hasOvercomeCard = attacker.specialCards.includes(CardName.Overcome);
  const hasWarChiefCard = attacker.specialCards.includes(CardName.WarChief);
  const canUseCard = !attacker.actionsThisTurn.includes(GameAction.UseCard);

  const handleCheckboxChange = (card: 'overcome' | 'warchief' | 'decide', checked: boolean) => {
    if (card === 'overcome') {
      setUseOvercomeCard(checked);
      if (checked) {
        setUseWarChief(false);
        setUseDecideCard(false);
      }
    } else if (card === 'warchief') {
      setUseWarChief(checked);
      if (checked) {
        setUseOvercomeCard(false);
      }
    } else if (card === 'decide') {
      setUseDecideCard(checked);
      if (checked) {
        setUseOvercomeCard(false);
      }
    }
  };

  const handleCancel = () => {
    let cardToCancel: CardName | undefined = undefined;
    if (useOvercomeCard) cardToCancel = CardName.Overcome;
    else if (useWarChief) cardToCancel = CardName.WarChief;
    else if (useDecideCard) cardToCancel = CardName.DecideDiceRoll;

    onCancel({ cardName: cardToCancel });
  };

  const handleAttack = () => {
    if (monsterForDisplay) {
      onRoll({ monster: monsterForDisplay, useDecideCard, decidedValue, useOvercomeCard, useWarChief });
    }
  };

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

  const renderAttackScreen = () => {
    const attackerSprite = PLAYER_DATA[attacker.color].sprite.attack;
    
    return (
        <>
            <AlertDialogHeader>
                <AlertDialogTitle>Attack {monsterForDisplay ? getMonsterName(monsterForDisplay) : 'Monster'}</AlertDialogTitle>
                <AlertDialogDescription>Prepare to fight the monster.</AlertDialogDescription>
            </AlertDialogHeader>
            <div className="flex flex-col justify-around gap-4 py-4 sm:flex-row">
                 <div className="flex flex-col items-center gap-2">
                    <h3 className="font-bold" style={{ color: attacker.color }}>{attacker.name}</h3>
                    <Image src={attackerSprite} alt={`${attacker.name} attacking`} width={64} height={64} unoptimized />
                    <p className="text-sm font-bold">Attack Power: {attacker.attackPower + 1}</p>
                 </div>

                {monsterForDisplay && (
                    <div className="flex flex-col items-center gap-2">
                        <h3 className="font-bold capitalize text-destructive">{getMonsterName(monsterForDisplay)}</h3>
                        <Image src={monsterForDisplay.sprite.attack} alt={monsterForDisplay.name} width={64} height={64} className='-scale-x-100' unoptimized />
                        <p className="text-sm font-bold">Power: {monsterForDisplay.level}</p>
                    </div>
                )}
            </div>
            
            <div className='space-y-4'>
                {hasOvercomeCard && canUseCard && (
                <div className="flex items-center space-x-2 rounded-md border bg-muted/50 p-4">
                    <Checkbox id="use-overcome-card" checked={useOvercomeCard} onCheckedChange={(checked) => handleCheckboxChange('overcome', !!checked)} />
                    <Label htmlFor="use-overcome-card" className='font-bold'>Use '{CardName.Overcome}' card to win automatically?</Label>
                </div>
                )}
                {hasWarChiefCard && canUseCard && (
                    <div className="flex items-center space-x-2 rounded-md border bg-muted/50 p-4">
                        <Checkbox id="use-warchief-card" checked={useWarChief} onCheckedChange={(checked) => handleCheckboxChange('warchief', !!checked)} disabled={useOvercomeCard} />
                        <Label htmlFor="use-warchief-card" className='font-bold'>Use '{CardName.WarChief}' card for +2 attack power?</Label>
                    </div>
                )}
                {hasDecideCard && canUseCard && (
                <div className="space-y-4 rounded-md border bg-muted/50 p-4">
                    <div className="flex items-center space-x-2">
                        <Checkbox id="use-decide-card" checked={useDecideCard} onCheckedChange={(checked) => handleCheckboxChange('decide', !!checked)} disabled={useOvercomeCard} />
                        <Label htmlFor="use-decide-card" className='font-bold'>Use '{CardName.DecideDiceRoll}' card?</Label>
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
                            />
                        </div>
                    )}
                </div>
                )}
            </div>
            <AlertDialogFooter className="mt-4 flex-col-reverse gap-2 sm:flex-row">
                <Button variant="outline" onClick={handleCancel} className="w-full sm:w-auto">Cancel</Button>
                <Button onClick={() => handleAttack()} disabled={!monsterForDisplay} className="w-full sm:w-auto">
                    Attack {monsterForDisplay ? getMonsterName(monsterForDisplay) : 'Monster'}!
                </Button>
            </AlertDialogFooter>
        </>
    );
};

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
            <Image src={attackerSprite} alt={`${attacker.name} sprite`} width={64} height={64} unoptimized />
            {renderDice(attackerRolls)}
            <p className="text-xl font-bold">Total: {attackerRolls.reduce((a, b) => a + b, 0)}</p>
          </div>
          {monsterForDisplay && <div className="flex flex-col items-center gap-2">
              <h3 className="font-bold capitalize text-destructive">{getMonsterName(monsterForDisplay)}</h3>
               {monsterSprite && <Image src={monsterSprite} alt={`${monsterForDisplay.name} sprite`} width={64} height={64} className="-scale-x-100" unoptimized />}
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
            <AlertDialogAction onClick={onClose} className="w-full">
                Continue
            </AlertDialogAction>
        </AlertDialogFooter>
      </>
    );
  }

  const renderContent = () => {
    if (phase === 'results') {
      return renderResultsScreen();
    }
    return renderAttackScreen();
  }

  return (
    <AlertDialog open={true} onOpenChange={handleCancel}>
      <AlertDialogContent>
        {renderContent()}
      </AlertDialogContent>
    </AlertDialog>
  );
}
