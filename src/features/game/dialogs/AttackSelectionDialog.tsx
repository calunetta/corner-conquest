'use client';

import type { Player, Army, AttackSelectionDialogState, PlayerPosition } from '@/lib/types';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Swords, Anchor, CheckCircle, Crosshair } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ReactNode } from 'react';
import { PLAYER_DATA } from '@/modules/game-rules';
import Image from 'next/image';

type AttackSelectionDialogProps = {
  state: AttackSelectionDialogState;
  onSelectTarget: (armyId: number) => void;
  onClose: () => void;
  isMyTurn: boolean;
};

export function AttackSelectionDialog({ state, onSelectTarget, onClose, isMyTurn }: AttackSelectionDialogProps) {
  if (!state) return null;
  const { armies, defendingPlayer } = state;

  const getArmyStatus = (army: Army): { text: string; icon: ReactNode; colorClass: string } => {
    if (army.hasActed) {
      return { text: 'Acted', icon: <CheckCircle className="h-3.5 w-3.5 text-muted-foreground" />, colorClass: 'text-muted-foreground' };
    }
    const position = defendingPlayer.positions.find((p: PlayerPosition) => p.armyId === army.id);
    if (position) {
      return { text: 'Positioned', icon: <Anchor className="h-3.5 w-3.5 text-cyan-400" />, colorClass: 'text-cyan-400' };
    }
    return { text: 'Ready', icon: <Crosshair className="h-3.5 w-3.5 text-red-400" />, colorClass: 'text-red-400' };
  };

  return (
    <AlertDialog open={true} onOpenChange={onClose}>
      <AlertDialogContent className="bg-background/90 backdrop-blur-2xl border border-white/15 shadow-[0_24px_72px_rgba(0,0,0,0.85)] max-w-md overflow-hidden">
        <AlertDialogHeader className="pb-2 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-red-500/20 border border-red-500/30 flex items-center justify-center text-red-400">
              <Crosshair className="h-5 w-5" />
            </div>
            <div>
              <AlertDialogTitle className="text-xl font-bold">Select Enemy Target</AlertDialogTitle>
              <AlertDialogDescription className="text-xs text-muted-foreground">
                Choose which of <span className="font-bold text-foreground">{defendingPlayer.name}</span>'s squads to attack.
              </AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 py-4">
          {armies.map((army: Army) => {
            const status = getArmyStatus(army);
            return (
              <button
                key={army.id}
                type="button"
                disabled={!isMyTurn}
                onClick={() => isMyTurn && onSelectTarget(army.id)}
                className={`flex flex-col items-center p-3 rounded-xl border transition-all duration-200 ${
                  isMyTurn
                    ? 'border-white/10 bg-black/40 hover:border-red-500/40 hover:bg-red-500/10 hover:scale-105'
                    : 'opacity-40 border-white/5 bg-black/20 cursor-not-allowed'
                }`}
              >
                <div className="relative h-12 w-12 flex items-center justify-center mb-1">
                  <Image
                    src={PLAYER_DATA[defendingPlayer.color]?.sprite.idle || '/sprites/blue_idle.gif'}
                    alt={`Enemy Army ${army.id + 1}`}
                    width={40}
                    height={40}
                    className="object-contain drop-shadow"
                    unoptimized
                  />
                </div>
                <p className="text-xs font-bold text-foreground">Enemy Squad {army.id + 1}</p>
                <div className={`flex items-center gap-1 text-[11px] font-semibold mt-1 ${status.colorClass}`}>
                  {status.icon}
                  <span>{status.text}</span>
                </div>
              </button>
            );
          })}
        </div>

        <AlertDialogFooter className="pt-2 border-t border-white/10">
          <Button variant="outline" size="sm" onClick={onClose} className="border-white/10 text-xs">
            Cancel
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
