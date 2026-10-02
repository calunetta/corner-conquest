'use client';

import type { GameState } from '@/lib/types';
import { CardName, GameAction } from '@/lib/types';
import { useState } from 'react';
import {
  AlertDialog,
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
import { Loader2, Trophy, Skull, Sparkles, Dices } from 'lucide-react';
import { FightIcon } from '@/components/icons';
import { Badge } from '@/components/ui/badge';

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

  const attackerTotal = attackerRolls.reduce((a, b) => a + b, 0);
  const defenderTotal = defenderRolls.reduce((a, b) => a + b, 0);

  return (
    <AlertDialog open={true}>
      <AlertDialogContent className="bg-background/90 backdrop-blur-2xl border border-white/15 shadow-[0_24px_72px_rgba(0,0,0,0.85)] max-w-md overflow-hidden">
        {/* Header */}
        <AlertDialogHeader className="pb-2 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-red-500/20 border border-red-500/30 flex items-center justify-center text-red-400">
              <FightIcon className="h-5 w-5" />
            </div>
            <div>
              <AlertDialogTitle className="text-xl font-bold">
                {isCombatOver ? 'Combat Outcome' : 'Territory Battle!'}
              </AlertDialogTitle>
              <AlertDialogDescription className="text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">{attacker.name}</span> attacks{' '}
                <span className="font-semibold text-foreground">{defender.name}</span>
              </AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>

        {/* Combat Modifier Selection */}
        {phase === 'rolling' && canPerformAction && canUseCard && (hasOvercomeCard || hasWarChiefCard) && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400 uppercase tracking-wider">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Tactical Combat Card</span>
            </div>
            <RadioGroup value={selectedCard} onValueChange={(val) => setSelectedCombatCard(val as any)} className="space-y-1.5">
              <div className="flex items-center space-x-2 p-1.5 rounded-lg hover:bg-white/5 transition-colors">
                <RadioGroupItem value="none" id="combat-card-none" />
                <Label htmlFor="combat-card-none" className="cursor-pointer text-xs font-medium">
                  Standard Roll (No card)
                </Label>
              </div>
              {hasOvercomeCard && (
                <div className="flex items-center space-x-2 p-1.5 rounded-lg bg-yellow-500/15 border border-yellow-400/30">
                  <RadioGroupItem value="overcome" id="combat-card-overcome" />
                  <Label htmlFor="combat-card-overcome" className="cursor-pointer text-xs font-semibold text-yellow-300">
                    Use '{CardName.Overcome}' (Guaranteed Victory)
                  </Label>
                </div>
              )}
              {hasWarChiefCard && (
                <div className="flex items-center space-x-2 p-1.5 rounded-lg bg-red-500/15 border border-red-400/30">
                  <RadioGroupItem value="warchief" id="combat-card-warchief" />
                  <Label htmlFor="combat-card-warchief" className="cursor-pointer text-xs font-semibold text-red-300">
                    Use '{CardName.WarChief}' (+2 Attack Dice)
                  </Label>
                </div>
              )}
            </RadioGroup>
          </div>
        )}

        {/* Combatants Arena */}
        <div className="flex items-center justify-between gap-2 py-3">
          {/* Attacker Box */}
          <div className={`flex-1 flex flex-col items-center p-3 rounded-xl border transition-all ${
            isCombatOver && winnerId === attackerId
              ? 'border-amber-400 bg-amber-500/15 shadow-[0_0_20px_rgba(245,158,11,0.3)]'
              : 'border-white/10 bg-black/40'
          }`}>
            <span className="text-xs font-bold truncate max-w-[100px]" style={{ color: attacker.color }}>
              {attacker.name}
            </span>
            <div className="my-2 h-14 w-14 flex items-center justify-center">
              <Image src={attackerSprite} alt={`${attacker.name} sprite`} width={54} height={54} className="object-contain" unoptimized />
            </div>
            {isCombatOver && (
              <>
                {renderDice(attackerRolls, winnerId === attackerId)}
                <span className="mt-1 text-sm font-black font-mono">
                  Total: {attackerTotal}
                </span>
              </>
            )}
          </div>

          {/* VS Divider */}
          <div className="flex flex-col items-center shrink-0">
            <div className="h-8 w-8 rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center">
              <FightIcon className="h-4 w-4" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground mt-0.5">VS</span>
          </div>

          {/* Defender Box */}
          <div className={`flex-1 flex flex-col items-center p-3 rounded-xl border transition-all ${
            isCombatOver && winnerId === defenderId
              ? 'border-amber-400 bg-amber-500/15 shadow-[0_0_20px_rgba(245,158,11,0.3)]'
              : 'border-white/10 bg-black/40'
          }`}>
            <span className="text-xs font-bold truncate max-w-[100px]" style={{ color: defender.color }}>
              {defender.name}
            </span>
            <div className="my-2 h-14 w-14 flex items-center justify-center">
              <Image src={defenderSprite} alt={`${defender.name} sprite`} width={54} height={54} className="object-contain -scale-x-100" unoptimized />
            </div>
            {isCombatOver && (
              <>
                {renderDice(defenderRolls, winnerId === defenderId)}
                <span className="mt-1 text-sm font-black font-mono">
                  Total: {defenderTotal}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Outcome Banner */}
        {isCombatOver && (
          <div className="text-center py-2 px-3 rounded-xl bg-black/50 border border-white/10">
            <div className="flex items-center justify-center gap-1.5">
              {winnerId !== null ? (
                <>
                  <Trophy className="h-5 w-5 text-yellow-400" />
                  <span className="text-base font-extrabold" style={{ color: players[winnerId].color }}>
                    {players[winnerId].name} Victorious!
                  </span>
                </>
              ) : (
                <>
                  <Skull className="h-5 w-5 text-muted-foreground" />
                  <span className="text-base font-bold text-muted-foreground">Draw - No Victor</span>
                </>
              )}
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <AlertDialogFooter className="pt-2 border-t border-white/10 gap-2">
          {phase === 'rolling' && (
            <>
              {canPerformAction ? (
                <Button
                  onClick={handleRollClick}
                  disabled={isRolling}
                  className="w-full font-bold bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white shadow-[0_0_16px_rgba(239,68,68,0.4)]"
                >
                  {isRolling ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Dices className="mr-2 h-4 w-4" />}
                  Roll for Battle!
                </Button>
              ) : (
                <div className="flex items-center justify-center w-full gap-2 text-xs text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Waiting for attacker to roll...</span>
                </div>
              )}
            </>
          )}

          {isCombatOver && (
            <Button
              onClick={onClose}
              className="w-full font-bold bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black shadow-[0_0_16px_rgba(245,158,11,0.3)]"
            >
              Confirm Results
            </Button>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
