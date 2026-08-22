
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Slider } from '@/components/ui/slider';
import Image from 'next/image';
import { PLAYER_DATA } from '@/lib/player-data';
import { Dices, Loader2 } from 'lucide-react';

type MonsterCombatDialogProps = {
  gameState: GameState;
  onRoll: (payload: { monster: Monster; useDecideCard: boolean; decidedValue: number; useOvercomeCard: boolean; useWarChief: boolean }) => void;
  onClose: () => void;
  onCancel: (payload?: { cardName?: CardName }) => void;
  isMyTurn?: boolean;
  localPlayerId?: number;
};

export function MonsterCombatDialog({ gameState, onRoll, onClose, onCancel, isMyTurn = false, localPlayerId }: MonsterCombatDialogProps) {
  const { monsterCombatState, players, map } = gameState;
  if (!monsterCombatState) return null;

  const { attackerId, attackerRolls, monsterRolls, winnerId, phase } = monsterCombatState;
  const attacker = players[attackerId];
  const monsterForDisplay = monsterCombatState.monster;
  const isAttacker = localPlayerId !== undefined ? localPlayerId === attackerId : isMyTurn;

  const [selectedCard, setSelectedCombatCard] = useState<'none' | 'overcome' | 'warchief' | 'decide'>('none');
  const [decidedValue, setDecidedValue] = useState(6);

  const hasDecideCard = attacker.specialCards.includes(CardName.DecideDiceRoll);
  const hasOvercomeCard = attacker.specialCards.includes(CardName.Overcome);
  const hasWarChiefCard = attacker.specialCards.includes(CardName.WarChief);
  const canUseCard = !attacker.actionsThisTurn.includes(GameAction.UseCard);

  const handleCancel = () => {
    onClose();
  };

  const handleAttack = () => {
    if (monsterForDisplay) {
      onRoll({
        monster: monsterForDisplay,
        useDecideCard: selectedCard === 'decide',
        decidedValue,
        useOvercomeCard: selectedCard === 'overcome',
        useWarChief: selectedCard === 'warchief',
      });
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
                    <p className="text-sm font-bold">Attack Power: {attacker.attackPower + 1} ({attacker.attackPower + 1 === 1 ? '1 Die' : `${attacker.attackPower + 1} Dice`})</p>
                 </div>

                {monsterForDisplay && (
                    <div className="flex flex-col items-center gap-2">
                        <h3 className="font-bold capitalize text-destructive">{getMonsterName(monsterForDisplay)}</h3>
                        <Image src={monsterForDisplay.sprite.attack} alt={monsterForDisplay.name} width={64} height={64} className='-scale-x-100' unoptimized />
                        <p className="text-sm font-bold">Power: {monsterForDisplay.level} ({monsterForDisplay.level === 1 ? '1 Die' : `${monsterForDisplay.level} Dice`})</p>
                    </div>
                )}
            </div>
            
            {canUseCard && (hasOvercomeCard || hasWarChiefCard || hasDecideCard) && (
              <div className="rounded-md border bg-muted/50 p-4 space-y-3">
                <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Select Combat Card</Label>
                <RadioGroup value={selectedCard} onValueChange={(val) => setSelectedCombatCard(val as any)}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="none" id="monster-card-none" />
                    <Label htmlFor="monster-card-none" className="cursor-pointer font-medium">None (Standard Roll)</Label>
                  </div>
                  {hasOvercomeCard && (
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="overcome" id="monster-card-overcome" />
                      <Label htmlFor="monster-card-overcome" className="cursor-pointer font-medium">
                        Use '{CardName.Overcome}' (Auto-win combat)
                      </Label>
                    </div>
                  )}
                  {hasWarChiefCard && (
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="warchief" id="monster-card-warchief" />
                      <Label htmlFor="monster-card-warchief" className="cursor-pointer font-medium">
                        Use '{CardName.WarChief}' (+2 Attack Power / +2 Dice)
                      </Label>
                    </div>
                  )}
                  {hasDecideCard && (
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="decide" id="monster-card-decide" />
                        <Label htmlFor="monster-card-decide" className="cursor-pointer font-medium">
                          Use '{CardName.DecideDiceRoll}' (Choose Die Value)
                        </Label>
                      </div>
                      {selectedCard === 'decide' && (
                        <div className="ml-6 space-y-2 rounded-md bg-background/60 p-3 border">
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-1.5">
                              <Dices className="h-4 w-4 text-primary" />
                              <Label className="text-sm">Choose First Die Value</Label>
                            </div>
                            <span className="font-bold text-primary text-base">{decidedValue}</span>
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
                </RadioGroup>
              </div>
            )}
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

  const renderSpectatorRollingScreen = () => {
    return (
      <>
        <AlertDialogHeader>
          <AlertDialogTitle>Monster Combat</AlertDialogTitle>
          <AlertDialogDescription>
            {attacker.name} is preparing to fight {monsterForDisplay ? getMonsterName(monsterForDisplay) : 'the monster'}...
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="flex flex-col items-center justify-center gap-3 py-6">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Waiting for combat resolution...</p>
        </div>
      </>
    );
  };

  const renderContent = () => {
    if (phase === 'results') {
      return renderResultsScreen();
    }
    if (!isAttacker) {
      return renderSpectatorRollingScreen();
    }
    return renderAttackScreen();
  };

  return (
    <AlertDialog open={true} onOpenChange={isAttacker ? handleCancel : undefined}>
      <AlertDialogContent>
        {renderContent()}
      </AlertDialogContent>
    </AlertDialog>
  );
}
