import Image from 'next/image';
import { cn } from '@/lib/utils';
import { styles } from './CombatDialog.styles';
import type { CombatantViewModel } from './CombatDialog.types';

export function CombatantCard({ combatant, isCombatOver, isDefender }: {
  combatant: CombatantViewModel;
  isCombatOver: boolean;
  isDefender?: boolean;
}) {
  return (
    <div className={styles.combatantBox({ isWinner: combatant.isWinner })}>
      <span className={styles.combatantName} style={{ color: combatant.color }}>
        {combatant.name}
      </span>
      <div className={styles.spriteContainer}>
        <Image
          src={combatant.sprite}
          alt={`${combatant.name} sprite`}
          width={54}
          height={54}
          className={cn(styles.spriteImage, isDefender && '-scale-x-100')}
          unoptimized
        />
      </div>
      {isCombatOver && (
        <>
          <div className={styles.diceContainer}>
            {combatant.rolls.map((roll, i) => (
              <div key={i} className={styles.diceCell({ isWinner: combatant.isWinner })}>
                {roll}
              </div>
            ))}
          </div>
          <span className={styles.diceTotal}>Total: {combatant.total}</span>
        </>
      )}
    </div>
  );
}
