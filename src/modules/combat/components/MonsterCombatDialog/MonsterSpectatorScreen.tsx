'use client';

import {
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
} from '@/components/ui/alert-dialog';
import { Skull, Loader2 } from 'lucide-react';
import { styles } from './MonsterCombatDialog.styles';
import type { MonsterSpectatorScreenProps } from './MonsterCombatDialog.types';

export function MonsterSpectatorScreen({ data }: MonsterSpectatorScreenProps) {
  return (
    <>
      <AlertDialogHeader className={styles.header}>
        <div className="flex items-center gap-2">
          <Skull className="h-5 w-5 text-purple-400" />
          <AlertDialogTitle className="text-lg font-bold">Monster Combat</AlertDialogTitle>
        </div>
        <AlertDialogDescription className={styles.description}>
          {data.attackerName} is preparing to fight {data.monsterLabel}...
        </AlertDialogDescription>
      </AlertDialogHeader>
      <div className={styles.spectatorContainer}>
        <Loader2 className={styles.spectatorLoader} />
        <p className={styles.spectatorText}>Waiting for combat resolution...</p>
      </div>
    </>
  );
}
