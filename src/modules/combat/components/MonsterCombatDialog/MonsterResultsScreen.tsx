'use client';

import {
  AlertDialogAction,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
} from '@/components/ui/alert-dialog';
import Image from 'next/image';
import { Skull, Trophy, Swords } from 'lucide-react';
import { cn } from '@/lib/utils';
import { styles } from './MonsterCombatDialog.styles';
import type { MonsterResultsScreenProps } from './MonsterCombatDialog.types';

function renderDice(rolls: number[], isWinner: boolean) {
  return (
    <div className={styles.diceContainer}>
      {rolls.map((roll, i) => (
        <div key={i} className={styles.diceCell({ isWinner })}>
          {roll}
        </div>
      ))}
    </div>
  );
}

export function MonsterResultsScreen({ data, onContinue }: MonsterResultsScreenProps) {
  const headerIcon = data.isPlayerWinner ? (
    <div className="h-9 w-9 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-400 flex items-center justify-center">
      <Trophy className="h-5 w-5" />
    </div>
  ) : (
    <div className="h-9 w-9 rounded-xl bg-red-500/20 border border-red-500/30 text-red-400 flex items-center justify-center">
      <Skull className="h-5 w-5" />
    </div>
  );

  return (
    <>
      <AlertDialogHeader className={styles.header}>
        <div className="flex items-center gap-2">
          {headerIcon}
          <div>
            <AlertDialogTitle className={styles.title}>Battle Outcome</AlertDialogTitle>
            {data.monster && (
              <AlertDialogDescription className={styles.description}>
                {data.attacker.name} fought the {data.monster.name}!
              </AlertDialogDescription>
            )}
          </div>
        </div>
      </AlertDialogHeader>

      <div className={styles.combatantsContainer}>
        <div className={styles.resultsBox({ isWinner: data.attacker.isWinner })}>
          <span
            className={cn(styles.combatantName, 'text-foreground')}
            style={{ color: data.attacker.color }}
          >
            {data.attacker.name}
          </span>
          <div className={styles.spriteContainer}>
            <Image
              src={data.attacker.sprite}
              alt={`${data.attacker.name} sprite`}
              width={54}
              height={54}
              className="object-contain"
              unoptimized
            />
          </div>
          {renderDice(data.attacker.rolls, data.attacker.isWinner)}
          <span className={styles.diceTotal}>Total: {data.attacker.total}</span>
        </div>

        <div className={styles.vsContainer}>
          <div className={styles.vsIcon}>
            <Swords className="h-4 w-4 text-red-400" />
          </div>
          <span className={styles.vsLabel}>VS</span>
        </div>

        {data.monster && (
          <div className={styles.monsterResultsBox({ isPlayerWinner: data.isPlayerWinner })}>
            <span className={cn(styles.combatantName, 'text-destructive')}>{data.monster.name}</span>
            <div className={styles.spriteContainer}>
              {data.monster.sprite && (
                <Image
                  src={data.monster.sprite}
                  alt={`${data.monster.name} sprite`}
                  width={54}
                  height={54}
                  className="object-contain -scale-x-100"
                  unoptimized
                />
              )}
            </div>
            {renderDice(data.monster.rolls, data.monster.isWinner)}
            <span className={styles.diceTotal}>Total: {data.monster.total}</span>
          </div>
        )}
      </div>

      <div className={styles.outcomeBox}>
        <h2 className={cn(styles.outcomeText, data.isPlayerWinner ? styles.outcomeWin : styles.outcomeLoss)}>
          {data.isPlayerWinner ? (
            <>
              <Trophy className="h-4 w-4" />
              {data.outcomeText}
            </>
          ) : (
            <>
              <Skull className="h-4 w-4" />
              {data.outcomeText}
            </>
          )}
        </h2>
      </div>

      <AlertDialogFooter className={styles.footer}>
        <AlertDialogAction onClick={onContinue} className={styles.continueButton}>
          Continue
        </AlertDialogAction>
      </AlertDialogFooter>
    </>
  );
}
