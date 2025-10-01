
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
import { Card, CardContent } from '@/components/ui/card';
import { AlertDialogCancel } from '@radix-ui/react-alert-dialog';
import Image from 'next/image';

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
    }

  return (
    <AlertDialog open={true} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Choose a Monster to Attack</AlertDialogTitle>
          <AlertDialogDescription>
            Select which monster you want to fight on this island.
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <div className="grid grid-cols-2 gap-4 py-4 sm:grid-cols-3">
          {monsters.map((monster, index) => {
            return (
              <Card
                key={index}
                className={`p-2 transition-all ${isMyTurn ? 'cursor-pointer hover:bg-muted' : 'cursor-not-allowed opacity-50'}`}
                onClick={() => isMyTurn && onSelectTarget(monster.name)}
              >
                <CardContent className="flex flex-col items-center gap-2 p-1 pt-2">
                    <Image src={monster.sprite.idle} alt={monster.name} width={64} height={64} unoptimized />
                    <p className="text-sm font-bold text-center">{getMonsterName(monster)}</p>
                    <p className="text-xs text-muted-foreground">Power: {monster.level}</p>
                </CardContent>
              </Card>
            )
          })}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose}>Cancel</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

    