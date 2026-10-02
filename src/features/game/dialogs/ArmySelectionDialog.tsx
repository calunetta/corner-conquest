'use client';

import type { Player, Army, ArmySelectionDialogState } from '@/lib/types';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Anchor, CheckCircle, Clock } from 'lucide-react';
import { FightIcon } from '@/components/icons';
import { Button } from '@/components/ui/button';
import type { ReactNode } from 'react';
import { PLAYER_DATA } from '@/lib/player-data';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';

type ArmySelectionDialogProps = {
  state: ArmySelectionDialogState;
  player: Player;
  onSelectArmy: (armyId: number) => void;
  onClose: () => void;
  isMyTurn: boolean;
  selectedArmyId?: number | null;
};

export function ArmySelectionDialog({ state, player, onSelectArmy, onClose, isMyTurn, selectedArmyId }: ArmySelectionDialogProps) {
  if (!state) return null;
  const { armies, x, y } = state;

  const getArmyStatus = (army: Army): { text: string; icon: ReactNode; colorClass: string } => {
    if (army.hasActed) {
      return { text: 'Acted', icon: <CheckCircle className="h-3.5 w-3.5 text-muted-foreground" />, colorClass: 'text-muted-foreground' };
    }
    const position = player.positions.find((p) => p.armyId === army.id);
    if (position) {
      return { text: 'Positioned', icon: <Anchor className="h-3.5 w-3.5 text-cyan-400" />, colorClass: 'text-cyan-400' };
    }
    return { text: 'Ready', icon: <Clock className="h-3.5 w-3.5 text-emerald-400" />, colorClass: 'text-emerald-400' };
  };

  return (
    <AlertDialog open={true} onOpenChange={onClose}>
      <AlertDialogContent className="bg-background/90 backdrop-blur-2xl border border-white/15 shadow-[0_24px_72px_rgba(0,0,0,0.85)] max-w-md overflow-hidden">
        <AlertDialogHeader className="pb-2 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center text-primary">
              <FightIcon className="h-5 w-5" />
            </div>
            <div>
              <AlertDialogTitle className="text-xl font-bold">Select Army Squad ({x}, {y})</AlertDialogTitle>
              <AlertDialogDescription className="text-xs text-muted-foreground">
                Multiple squads garrisoned here. Select which squad to order.
              </AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 py-4">
          {armies.map((army: Army) => {
            const status = getArmyStatus(army);
            const isSelectable = (!army.hasActed || player.hasExtraMove) && isMyTurn;
            const isCurrentlySelected = selectedArmyId === army.id;

            return (
              <button
                key={army.id}
                type="button"
                disabled={!isSelectable}
                onClick={() => isSelectable && onSelectArmy(army.id)}
                className={`flex flex-col items-center p-3 rounded-xl border transition-all duration-200 ${
                  isCurrentlySelected
                    ? 'border-amber-400 bg-amber-500/20 shadow-[0_0_16px_rgba(245,158,11,0.4)] scale-105'
                    : isSelectable
                    ? 'border-white/10 bg-black/40 hover:border-white/20 hover:bg-black/60 hover:scale-[1.02]'
                    : 'opacity-40 border-white/5 bg-black/20 cursor-not-allowed'
                }`}
              >
                <div className="relative h-12 w-12 flex items-center justify-center mb-1">
                  <Image
                    src={PLAYER_DATA[player.color]?.sprite.idle || '/sprites/blue_idle.gif'}
                    alt={`Army ${army.id + 1}`}
                    width={40}
                    height={40}
                    className="object-contain drop-shadow"
                    unoptimized
                  />
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-xs font-bold text-foreground">Squad {army.id + 1}</span>
                  {isCurrentlySelected && (
                    <Badge className="bg-amber-500 text-black text-[9px] px-1 py-0 font-black">
                      ACTIVE
                    </Badge>
                  )}
                </div>
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
