'use client';

import { Loader2, Trophy, Skull, Sparkles, Dices } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { FightIcon } from '@/modules/shared';
import { cn } from '@/lib/utils';
import { styles } from './CombatDialog.styles';
import { CombatantCard } from './CombatantCard';
import { useCombatDialog } from './CombatDialog.hook';
import type { CombatDialogProps } from './CombatDialog.types';

export function CombatDialog(props: CombatDialogProps) {
  const { viewModel, selectedCard, isRolling, onSelectCard, onRollClick, onClose } = useCombatDialog(props);

  if (!viewModel) return null;

  const { phase, isCombatOver, attacker, defender, winner, canPerformAction, canSelectCard, hasOvercomeCard, hasWarChiefCard } = viewModel;

  return (
    <AlertDialog open={true}>
      <AlertDialogContent className={styles.content}>
        <AlertDialogHeader className={styles.header}>
          <div className="flex items-center gap-2">
            <div className={styles.headerIcon}>
              <FightIcon className={styles.headerIconSvg} />
            </div>
            <div>
              <AlertDialogTitle className={styles.title}>
                {isCombatOver ? 'Combat Outcome' : 'Territory Battle!'}
              </AlertDialogTitle>
              <AlertDialogDescription className={styles.description}>
                <span className={styles.descriptionHighlight}>{attacker.name}</span> attacks{' '}
                <span className={styles.descriptionHighlight}>{defender.name}</span>
              </AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>

        {phase === 'rolling' && canPerformAction && canSelectCard && (
          <div className={styles.tacticalCardBlock}>
            <div className={styles.tacticalCardLabel}>
              <Sparkles className={styles.tacticalCardLabelIcon} />
              <span>Tactical Combat Card</span>
            </div>
            <RadioGroup value={selectedCard} onValueChange={onSelectCard} className={styles.radioGroup}>
              <div className={styles.radioGroupItemDefault}>
                <RadioGroupItem value="none" id="combat-card-none" />
                <Label htmlFor="combat-card-none" className={styles.radioGroupLabel}>
                  Standard Roll (No card)
                </Label>
              </div>
              {hasOvercomeCard && (
                <div className={styles.radioGroupItemOvercome}>
                  <RadioGroupItem value="overcome" id="combat-card-overcome" />
                  <Label htmlFor="combat-card-overcome" className={cn(styles.radioGroupLabelSpecial, styles.radioGroupLabelOvercome)}>
                    Use &apos;Overcome&apos; (Guaranteed Victory)
                  </Label>
                </div>
              )}
              {hasWarChiefCard && (
                <div className={styles.radioGroupItemWarChief}>
                  <RadioGroupItem value="warchief" id="combat-card-warchief" />
                  <Label htmlFor="combat-card-warchief" className={cn(styles.radioGroupLabelSpecial, styles.radioGroupLabelWarChief)}>
                    Use &apos;War Chief&apos; (+2 Attack Dice)
                  </Label>
                </div>
              )}
            </RadioGroup>
          </div>
        )}

        <div className={styles.combatantsArena}>
          <CombatantCard combatant={attacker} isCombatOver={isCombatOver} />
          <div className={styles.vsBox}>
            <div className={styles.vsIcon}>
              <FightIcon className={styles.vsIconSvg} />
            </div>
            <span className={styles.vsLabel}>VS</span>
          </div>
          <CombatantCard combatant={defender} isCombatOver={isCombatOver} isDefender />
        </div>

        {isCombatOver && (
          <div className={styles.outcomeBanner}>
            <div className={styles.outcomeBannerContent}>
              {winner ? (
                <>
                  <Trophy className={styles.trophyIcon} />
                  <span className={styles.victoryText} style={{ color: winner.color }}>
                    {winner.name} Victorious!
                  </span>
                </>
              ) : (
                <>
                  <Skull className={styles.skullIcon} />
                  <span className={styles.drawText}>Draw - No Victor</span>
                </>
              )}
            </div>
          </div>
        )}

        <AlertDialogFooter className={styles.footer}>
          {phase === 'rolling' && (
            <>
              {canPerformAction ? (
                <Button onClick={onRollClick} disabled={isRolling} className={styles.rollButton}>
                  {isRolling ? <Loader2 className={styles.dicesIcon} /> : <Dices className={styles.dicesIcon} />}
                  Roll for Battle!
                </Button>
              ) : (
                <div className={styles.waitingText}>
                  <Loader2 className={styles.loaderIcon} />
                  <span>Waiting for attacker to roll...</span>
                </div>
              )}
            </>
          )}
          {isCombatOver && (
            <Button onClick={onClose} className={styles.confirmButton}>
              Confirm Results
            </Button>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
