'use client';

import { PLAYER_DATA } from '@/modules/game-rules';
import {
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { Skull, Swords } from 'lucide-react';
import { cn } from '@/lib/utils';
import { styles } from './MonsterCombatDialog.styles';
import { MonsterCombatCardSelector } from './MonsterCombatCardSelector';
import type { MonsterAttackScreenProps } from './MonsterCombatDialog.types';

export function MonsterAttackScreen({
  data,
  selectedCard,
  decidedValue,
  onSelectCard,
  onDecidedValueChange,
  onCancel,
  onAttack,
}: MonsterAttackScreenProps) {
  const attackerSprite = PLAYER_DATA[data.attackerColor].sprite.attack;

  return (
    <>
      <AlertDialogHeader className={styles.header}>
        <div className="flex items-center gap-2">
          <div className={styles.headerIcon}>
            <Skull className="h-5 w-5" />
          </div>
          <div>
            <AlertDialogTitle className={styles.title}>{data.title}</AlertDialogTitle>
            <AlertDialogDescription className={styles.description}>
              Conquer the monster to liberate the island and claim its territory.
            </AlertDialogDescription>
          </div>
        </div>
      </AlertDialogHeader>

      <div className={styles.combatantsContainer}>
        <div className={styles.attackerBox}>
          <span className={cn(styles.combatantName, 'text-foreground')} style={{ color: data.attackerColor }}>
            {data.attackerName}
          </span>
          <div className={styles.spriteContainer}>
            <Image
              src={attackerSprite}
              alt={`${data.attackerName} attacking`}
              width={54}
              height={54}
              className="object-contain"
              unoptimized
            />
          </div>
          <span className={styles.powerLabel}>{data.attackerPowerLabel}</span>
        </div>

        <div className={styles.vsContainer}>
          <div className={styles.vsIcon}>
            <Swords className="h-4 w-4 text-red-400" />
          </div>
          <span className={styles.vsLabel}>VS</span>
        </div>

        {data.monster && (
          <div className={styles.monsterBox}>
            <span className={cn(styles.combatantName, 'text-destructive')}>{data.monster.name}</span>
            <div className={styles.spriteContainer}>
              <Image
                src={data.monster.sprite}
                alt={data.monster.name}
                width={54}
                height={54}
                className="object-contain -scale-x-100"
                unoptimized
              />
            </div>
            <span className={styles.monsterPowerLabel}>{data.monster.powerLabel}</span>
          </div>
        )}
      </div>

      {data.canSelectCard && (
        <MonsterCombatCardSelector
          data={data}
          selectedCard={selectedCard}
          decidedValue={decidedValue}
          onSelectCard={onSelectCard}
          onDecidedValueChange={onDecidedValueChange}
        />
      )}

      <AlertDialogFooter className={styles.footer}>
        <Button variant="outline" size="sm" onClick={onCancel} className="border-white/10 text-xs">
          Cancel
        </Button>
        <Button onClick={onAttack} disabled={!data.canAttack} className={styles.attackButton}>
          <Swords className="mr-1.5 h-3.5 w-3.5" />
          Attack Monster!
        </Button>
      </AlertDialogFooter>
    </>
  );
}
