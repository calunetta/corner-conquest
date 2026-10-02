import React from 'react';
import Image from 'next/image';
import type { CardName, SpecialIslandRollDialogState } from '@/lib/types';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Dices, Sparkles, XCircle } from 'lucide-react';
import { SPECIAL_CARD_DESCRIPTIONS } from '@/lib/card-data';

type SpecialIslandRollDialogProps = {
  state: SpecialIslandRollDialogState;
  onRoll: () => void;
  onClose: () => void;
};

export function SpecialIslandRollDialog({ state, onRoll, onClose }: SpecialIslandRollDialogProps) {
  if (!state) return null;
  const { roll, cardDrawn } = state;
  const isRolled = roll !== null;

  return (
    <AlertDialog open={true} onOpenChange={onClose}>
      <AlertDialogContent className="bg-background/90 backdrop-blur-2xl border border-white/15 shadow-[0_24px_72px_rgba(0,0,0,0.85)] max-w-md overflow-hidden">
        <AlertDialogHeader className="pb-2 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 overflow-hidden">
              <Image
                src="/sprites/icon_gold.png"
                alt="Treasure"
                width={24}
                height={24}
                className="object-contain"
                unoptimized
              />
            </div>
            <div>
              <AlertDialogTitle className="text-xl font-bold">Special Island Treasure</AlertDialogTitle>
              <AlertDialogDescription className="text-xs text-muted-foreground">
                Roll the ancient dice: rolling a 3 or 6 unlocks a rare special card!
              </AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>

        <div className="flex flex-col items-center justify-center gap-4 py-5">
          {!isRolled ? (
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20">
              <Dices className="h-16 w-16 text-amber-400 animate-bounce [animation-duration:2s]" />
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Result</span>
              <div className={`flex h-16 w-16 items-center justify-center rounded-xl border-2 text-4xl font-black shadow-lg ${
                cardDrawn
                  ? 'bg-amber-500/20 border-amber-400 text-amber-300 shadow-[0_0_20px_rgba(245,158,11,0.5)]'
                  : 'bg-black/60 border-white/20 text-foreground'
              }`}>
                {roll}
              </div>
            </div>
          )}

          {isRolled && (
            <div className="w-full text-center p-3 rounded-xl bg-black/40 border border-white/10">
              {cardDrawn ? (
                <>
                  <div className="flex items-center justify-center gap-1.5 text-base font-extrabold text-amber-400">
                    <Sparkles className="h-5 w-5" />
                    <span>Treasure Unlocked!</span>
                  </div>
                  <p className="mt-1 text-sm font-bold text-foreground">
                    Card Acquired: <span className="text-amber-300">{cardDrawn}</span>
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                    "{SPECIAL_CARD_DESCRIPTIONS[cardDrawn as CardName]}"
                  </p>
                </>
              ) : (
                <>
                  <div className="flex items-center justify-center gap-1.5 text-sm font-bold text-destructive">
                    <XCircle className="h-4 w-4" />
                    <span>No Treasure This Time</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">Better fortune on your next discovery!</p>
                </>
              )}
            </div>
          )}
        </div>

        <AlertDialogFooter className="pt-2 border-t border-white/10">
          {!isRolled ? (
            <Button
              onClick={onRoll}
              className="w-full font-bold bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black shadow-[0_0_16px_rgba(245,158,11,0.3)]"
            >
              <Dices className="mr-2 h-4 w-4" />
              Roll for Treasure (3 or 6)
            </Button>
          ) : (
            <Button onClick={onClose} className="w-full font-bold bg-white/10 hover:bg-white/20 text-foreground">
              Close
            </Button>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
