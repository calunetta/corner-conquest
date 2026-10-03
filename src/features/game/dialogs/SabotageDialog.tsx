'use client';

import type { Player } from '@/lib/types';
import { CardName } from '@/lib/types';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Ban, ShieldAlert } from 'lucide-react';
import { PLAYER_DATA } from '@/modules/game-rules';
import Image from 'next/image';

type SabotageDialogProps = {
  players: Player[];
  onSabotage: (targetPlayerId: number) => void;
  onClose: () => void;
};

export function SabotageDialog({ players, onSabotage, onClose }: SabotageDialogProps) {
  return (
    <AlertDialog open={true} onOpenChange={onClose}>
      <AlertDialogContent className="bg-background/90 backdrop-blur-2xl border border-white/15 shadow-[0_24px_72px_rgba(0,0,0,0.85)] max-w-md overflow-hidden">
        <AlertDialogHeader className="pb-2 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-red-500/20 border border-red-500/30 flex items-center justify-center text-red-400">
              <Ban className="h-5 w-5" />
            </div>
            <div>
              <AlertDialogTitle className="text-xl font-bold">Sabotage Opponent</AlertDialogTitle>
              <AlertDialogDescription className="text-xs text-muted-foreground">
                Target an opponent commander. Their entire army will be forced to skip their next turn.
              </AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 py-4">
          {players.map((player) => (
            <button
              key={player.id}
              type="button"
              onClick={() => onSabotage(player.id)}
              className="flex flex-col items-center p-3 rounded-xl border border-white/10 bg-black/40 hover:border-red-500/40 hover:bg-red-500/10 hover:scale-105 transition-all duration-200"
            >
              <div className="relative h-10 w-10 mb-1 flex items-center justify-center">
                <Image
                  src={PLAYER_DATA[player.color]?.sprite.idle || '/sprites/blue_idle.gif'}
                  alt={player.name}
                  width={36}
                  height={36}
                  className="object-contain drop-shadow"
                  unoptimized
                />
              </div>
              <p className="text-xs font-bold truncate max-w-full text-foreground">{player.name}</p>
              <span className="text-[10px] text-red-400 font-semibold mt-0.5 flex items-center gap-0.5">
                <Ban className="h-2.5 w-2.5" /> Skip Turn
              </span>
            </button>
          ))}
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
