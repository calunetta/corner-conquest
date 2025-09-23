
'use client';
import type { SpecialIslandRollDialogState } from '../types';
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
  const { roll, cardDrawn } = state;
  const isRolled = roll !== null;

  return (
    <AlertDialog open={true} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Special Island</AlertDialogTitle>
          <AlertDialogDescription>
            You've landed on a special island! Roll the dice for a chance to find a treasure.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="flex flex-col items-center justify-center gap-4 py-6">
          {!isRolled ? (
            <Dices className="h-20 w-20 text-accent" />
          ) : (
            <div className="flex flex-col items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground">You rolled a...</span>
              <div className="flex h-16 w-16 items-center justify-center rounded-lg border-2 text-4xl font-bold">
                {roll}
              </div>
            </div>
          )}

          {isRolled && (
            <div className="mt-4 text-center">
              {cardDrawn ? (
                <>
                  <p className="flex items-center justify-center gap-2 text-lg font-semibold text-green-500">
                    <Sparkles className="h-5 w-5" /> Success!
                  </p>
                  <p className="mt-2 text-muted-foreground">
                    You found a special card: <span className="font-bold text-foreground">{cardDrawn}</span>
                  </p>
                   <p className="mt-1 text-xs text-muted-foreground/80">
                    "{SPECIAL_CARD_DESCRIPTIONS[cardDrawn]}"
                  </p>
                </>
              ) : (
                <>
                   <p className="flex items-center justify-center gap-2 text-lg font-semibold text-destructive">
                    <XCircle className="h-5 w-5" /> Bad Luck!
                  </p>
                  <p className="mt-2 text-muted-foreground">You found nothing this time. Better luck next time!</p>
                </>
              )}
            </div>
          )}
        </div>

        <AlertDialogFooter>
          {!isRolled ? (
            <Button onClick={onRoll} className="w-full">
              <Dices className="mr-2 h-4 w-4" />
              Roll for Treasure (3 or 6 to win)
            </Button>
          ) : (
            <Button onClick={onClose} className="w-full">Close</Button>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
