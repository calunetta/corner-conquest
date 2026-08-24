'use client';

import type { GameState, Monster } from '@/lib/types';
import { CardName, GameAction } from '@/lib/types';
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
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Slider } from '@/components/ui/slider';
import Image from 'next/image';
import { PLAYER_DATA } from '@/lib/player-data';
import { Dices, Loader2, Skull, Trophy, Swords, Sparkles, Shield } from 'lucide-react';

type MonsterCombatDialogProps = {
  gameState: GameState;
  onRoll: (payload: { monster: Monster; useDecideCard: boolean; decidedValue: number; useOvercomeCard: boolean; useWarChief: boolean }) => void;
  onClose: () => void;
  onCancel: (payload?: { cardName?: CardName }) => void;
  isMyTurn?: boolean;
  localPlayerId?: number;
};

export function MonsterCombatDialog({ gameState, onRoll, onClose, onCancel, isMyTurn = false, localPlayerId }: MonsterCombatDialogProps) {
  const { monsterCombatState, players } = gameState;
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

  const renderDice = (rolls: number[], isWinner?: boolean) => (
    <div className="flex flex-wrap justify-center gap-1.5 mt-1">
      {rolls.map((roll, i) => (
        <div
          key={i}
          className={`flex h-9 w-9 items-center justify-center rounded-lg border-2 text-base font-black shadow-md transition-transform duration-300 ${
            isWinner
              ? 'bg-amber-500/20 border-amber-400 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.5)] scale-105'
              : 'bg-black/60 border-white/20 text-foreground'
          }`}
        >
          {roll}
        </div>
      ))}
    </div>
  );

  const getMonsterName = (monster: Monster) => {
    return `${monster.name} (Lvl ${monster.level})`;
  };

  const renderAttackScreen = () => {
    const attackerSprite = PLAYER_DATA[attacker.color].sprite.attack;
    
    return (
      <>
        <AlertDialogHeader className="pb-2 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <Skull className="h-5 w-5" />
            </div>
            <div>
              <AlertDialogTitle className="text-xl font-bold">
                Monster Encounter: {monsterForDisplay ? getMonsterName(monsterForDisplay) : 'Monster'}
              </AlertDialogTitle>
              <AlertDialogDescription className="text-xs text-muted-foreground">
                Conquer the monster to liberate the island and claim its territory.
              </AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>

        {/* Combatants Side by Side */}
        <div className="flex items-center justify-between gap-2 py-3">
          <div className="flex-1 flex flex-col items-center p-3 rounded-xl border border-white/10 bg-black/40">
            <span className="text-xs font-bold truncate max-w-[100px]" style={{ color: attacker.color }}>
              {attacker.name}
            </span>
            <div className="my-2 h-14 w-14 flex items-center justify-center">
              <Image src={attackerSprite} alt={`${attacker.name} attacking`} width={54} height={54} className="object-contain" unoptimized />
            </div>
            <span className="text-xs font-bold text-foreground">
              Power: {attacker.attackPower + 1} ({attacker.attackPower + 1 === 1 ? '1 Die' : `${attacker.attackPower + 1} Dice`})
            </span>
          </div>

          <div className="flex flex-col items-center shrink-0">
            <div className="h-8 w-8 rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center">
              <Swords className="h-4 w-4 text-red-400" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground mt-0.5">VS</span>
          </div>

          {monsterForDisplay && (
            <div className="flex-1 flex flex-col items-center p-3 rounded-xl border border-destructive/30 bg-destructive/10">
              <span className="text-xs font-bold capitalize text-destructive truncate max-w-[100px]">
                {monsterForDisplay.name}
              </span>
              <div className="my-2 h-14 w-14 flex items-center justify-center">
                <Image src={monsterForDisplay.sprite.attack} alt={monsterForDisplay.name} width={54} height={54} className="object-contain -scale-x-100" unoptimized />
              </div>
              <span className="text-xs font-bold text-destructive">
                Power: {monsterForDisplay.level} ({monsterForDisplay.level === 1 ? '1 Die' : `${monsterForDisplay.level} Dice`})
              </span>
            </div>
          )}
        </div>
        
        {/* Tactical Cards Selection */}
        {canUseCard && (hasOvercomeCard || hasWarChiefCard || hasDecideCard) && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400 uppercase tracking-wider">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Tactical Combat Card</span>
            </div>
            <RadioGroup value={selectedCard} onValueChange={(val) => setSelectedCombatCard(val as any)} className="space-y-1.5">
              <div className="flex items-center space-x-2 p-1.5 rounded-lg hover:bg-white/5 transition-colors">
                <RadioGroupItem value="none" id="monster-card-none" />
                <Label htmlFor="monster-card-none" className="cursor-pointer text-xs font-medium">
                  Standard Roll (No card)
                </Label>
              </div>
              {hasOvercomeCard && (
                <div className="flex items-center space-x-2 p-1.5 rounded-lg bg-yellow-500/15 border border-yellow-400/30">
                  <RadioGroupItem value="overcome" id="monster-card-overcome" />
                  <Label htmlFor="monster-card-overcome" className="cursor-pointer text-xs font-semibold text-yellow-300">
                    Use '{CardName.Overcome}' (Guaranteed Victory)
                  </Label>
                </div>
              )}
              {hasWarChiefCard && (
                <div className="flex items-center space-x-2 p-1.5 rounded-lg bg-red-500/15 border border-red-400/30">
                  <RadioGroupItem value="warchief" id="monster-card-warchief" />
                  <Label htmlFor="monster-card-warchief" className="cursor-pointer text-xs font-semibold text-red-300">
                    Use '{CardName.WarChief}' (+2 Attack Dice)
                  </Label>
                </div>
              )}
              {hasDecideCard && (
                <div className="space-y-2 p-1.5 rounded-lg bg-blue-500/15 border border-blue-400/30">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="decide" id="monster-card-decide" />
                    <Label htmlFor="monster-card-decide" className="cursor-pointer text-xs font-semibold text-blue-300">
                      Use '{CardName.DecideDiceRoll}' (Choose First Die Value)
                    </Label>
                  </div>
                  {selectedCard === 'decide' && (
                    <div className="ml-6 space-y-2 rounded-lg bg-black/50 p-2.5 border border-white/10">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-1 text-xs">
                          <Dices className="h-3.5 w-3.5 text-blue-400" />
                          <span>Chosen Value:</span>
                        </div>
                        <span className="font-bold text-blue-400 text-sm font-mono">{decidedValue}</span>
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

        <AlertDialogFooter className="pt-2 border-t border-white/10 gap-2">
          <Button variant="outline" size="sm" onClick={handleCancel} className="border-white/10 text-xs">
            Cancel
          </Button>
          <Button
            onClick={() => handleAttack()}
            disabled={!monsterForDisplay}
            className="font-bold bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white shadow-[0_0_16px_rgba(239,68,68,0.4)] text-xs px-4"
          >
            <Swords className="mr-1.5 h-3.5 w-3.5" />
            Attack Monster!
          </Button>
        </AlertDialogFooter>
      </>
    );
  };

  const renderResultsScreen = () => {
    const isPlayerWinner = winnerId === attackerId;
    const attackerSprite = isPlayerWinner ? PLAYER_DATA[attacker.color].sprite.attack : PLAYER_DATA[attacker.color].sprite.death;
    const monsterSprite = isPlayerWinner ? monsterForDisplay?.sprite.death : monsterForDisplay?.sprite.attack;
    const attackerTotal = attackerRolls.reduce((a, b) => a + b, 0);
    const monsterTotal = monsterRolls.reduce((a, b) => a + b, 0);
    
    return (
      <>
        <AlertDialogHeader className="pb-2 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className={`h-9 w-9 rounded-xl flex items-center justify-center ${
              isPlayerWinner ? 'bg-amber-500/20 border border-amber-500/30 text-amber-400' : 'bg-red-500/20 border border-red-500/30 text-red-400'
            }`}>
              {isPlayerWinner ? <Trophy className="h-5 w-5" /> : <Skull className="h-5 w-5" />}
            </div>
            <div>
              <AlertDialogTitle className="text-xl font-bold">Battle Outcome</AlertDialogTitle>
              {monsterForDisplay && (
                <AlertDialogDescription className="text-xs text-muted-foreground">
                  {attacker.name} fought the {getMonsterName(monsterForDisplay)}!
                </AlertDialogDescription>
              )}
            </div>
          </div>
        </AlertDialogHeader>
        
        <div className="flex items-center justify-between gap-2 py-3">
          <div className={`flex-1 flex flex-col items-center p-3 rounded-xl border ${
            isPlayerWinner
              ? 'border-amber-400 bg-amber-500/15 shadow-[0_0_20px_rgba(245,158,11,0.3)]'
              : 'border-white/10 bg-black/40'
          }`}>
            <span className="text-xs font-bold truncate max-w-[100px]" style={{ color: attacker.color }}>
              {attacker.name}
            </span>
            <div className="my-2 h-14 w-14 flex items-center justify-center">
              <Image src={attackerSprite} alt={`${attacker.name} sprite`} width={54} height={54} className="object-contain" unoptimized />
            </div>
            {renderDice(attackerRolls, isPlayerWinner)}
            <span className="mt-1 text-sm font-black font-mono">Total: {attackerTotal}</span>
          </div>

          <div className="flex flex-col items-center shrink-0">
            <div className="h-8 w-8 rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center">
              <Swords className="h-4 w-4 text-red-400" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground mt-0.5">VS</span>
          </div>

          {monsterForDisplay && (
            <div className={`flex-1 flex flex-col items-center p-3 rounded-xl border ${
              !isPlayerWinner
                ? 'border-red-500 bg-red-500/15 shadow-[0_0_20px_rgba(239,68,68,0.3)]'
                : 'border-white/10 bg-black/40'
            }`}>
              <span className="text-xs font-bold capitalize text-destructive truncate max-w-[100px]">
                {monsterForDisplay.name}
              </span>
              <div className="my-2 h-14 w-14 flex items-center justify-center">
                {monsterSprite && (
                  <Image src={monsterSprite} alt={`${monsterForDisplay.name} sprite`} width={54} height={54} className="object-contain -scale-x-100" unoptimized />
                )}
              </div>
              {renderDice(monsterRolls, !isPlayerWinner)}
              <span className="mt-1 text-sm font-black font-mono">Total: {monsterTotal}</span>
            </div>
          )}
        </div>

        <div className="text-center py-2 px-3 rounded-xl bg-black/50 border border-white/10">
          <h2 className="text-base font-extrabold">
            {isPlayerWinner && winnerId !== null ? (
              <span className="text-yellow-400 flex items-center justify-center gap-1.5">
                <Trophy className="h-4 w-4" />
                {players[winnerId].name} Defeated the Monster!
              </span>
            ) : (
              <span className="text-destructive flex items-center justify-center gap-1.5">
                <Skull className="h-4 w-4" />
                The Monster prevailed!
              </span>
            )}
          </h2>
        </div>

        <AlertDialogFooter className="pt-2 border-t border-white/10">
          <AlertDialogAction onClick={onClose} className="w-full font-bold bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black shadow-[0_0_16px_rgba(245,158,11,0.3)]">
            Continue
          </AlertDialogAction>
        </AlertDialogFooter>
      </>
    );
  };

  const renderSpectatorRollingScreen = () => {
    return (
      <>
        <AlertDialogHeader className="pb-2 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Skull className="h-5 w-5 text-purple-400" />
            <AlertDialogTitle className="text-lg font-bold">Monster Combat</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-xs text-muted-foreground">
            {attacker.name} is preparing to fight {monsterForDisplay ? getMonsterName(monsterForDisplay) : 'the monster'}...
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="flex flex-col items-center justify-center gap-3 py-6">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-xs text-muted-foreground">Waiting for combat resolution...</p>
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
      <AlertDialogContent className="bg-background/90 backdrop-blur-2xl border border-white/15 shadow-[0_24px_72px_rgba(0,0,0,0.85)] max-w-md overflow-hidden">
        {renderContent()}
      </AlertDialogContent>
    </AlertDialog>
  );
}
