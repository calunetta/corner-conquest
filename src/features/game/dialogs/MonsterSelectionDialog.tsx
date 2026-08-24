'use client';

import type { Monster, MonsterSelectionDialogState } from '@/lib/types';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { Skull } from 'lucide-react';

type MonsterSelectionDialogProps = {
  state: MonsterSelectionDialogState;
  onSelectTarget: (monsterName: string) => void;
  onClose: () => void;
  isMyTurn: boolean;
};

export function MonsterSelectionDialog({ state, onSelectTarget, onClose, isMyTurn }: MonsterSelectionDialogProps) {
  if (!state) return null;
  const { monsters } = state;

  const getMonsterName = (monster: Monster) => {
    return `${monster.name} (Lvl ${monster.level})`;
  };

  return (
    <AlertDialog open={true} onOpenChange={onClose}>
      <AlertDialogContent className="bg-background/90 backdrop-blur-2xl border border-white/15 shadow-[0_24px_72px_rgba(0,0,0,0.85)] max-w-md overflow-hidden">
        <AlertDialogHeader className="pb-2 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <Skull className="h-5 w-5" />
            </div>
            <div>
              <AlertDialogTitle className="text-xl font-bold">Select Wild Monster</AlertDialogTitle>
              <AlertDialogDescription className="text-xs text-muted-foreground">
                Multiple beasts roam this island. Select which monster to engage in battle.
              </AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>

        <div className="grid grid-cols-2 gap-3 py-4">
          {monsters.map((monster: Monster, index: number) => {
            return (
              <button
                key={index}
                type="button"
                disabled={!isMyTurn}
                onClick={() => isMyTurn && onSelectTarget(monster.name)}
                className={`flex flex-col items-center p-3 rounded-xl border transition-all duration-200 ${
                  isMyTurn
                    ? 'border-white/10 bg-black/40 hover:border-purple-500/40 hover:bg-purple-500/10 hover:scale-105'
                    : 'opacity-40 border-white/5 bg-black/20 cursor-not-allowed'
                }`}
              >
                <div className="relative h-14 w-14 flex items-center justify-center mb-1">
                  <Image src={monster.sprite.idle} alt={monster.name} width={54} height={54} className="object-contain drop-shadow" unoptimized />
                </div>
                <p className="text-xs font-bold capitalize text-foreground text-center">{getMonsterName(monster)}</p>
                <span className="text-[11px] font-semibold text-purple-400 mt-0.5">Power: {monster.level} Dice</span>
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
