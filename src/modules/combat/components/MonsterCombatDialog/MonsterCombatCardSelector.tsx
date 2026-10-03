'use client';

import { CardName } from '@/lib/types';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Slider } from '@/components/ui/slider';
import { Dices, Sparkles } from 'lucide-react';
import { styles } from './MonsterCombatDialog.styles';
import type { MonsterCombatCardSelection, MonsterAttackViewModel } from './MonsterCombatDialog.types';

export function MonsterCombatCardSelector({
  data,
  selectedCard,
  decidedValue,
  onSelectCard,
  onDecidedValueChange,
}: {
  data: MonsterAttackViewModel;
  selectedCard: MonsterCombatCardSelection;
  decidedValue: number;
  onSelectCard: (card: MonsterCombatCardSelection) => void;
  onDecidedValueChange: (value: number) => void;
}) {
  return (
    <div className={styles.tacticalCardsContainer}>
      <div className={styles.tacticalCardsHeader}>
        <Sparkles className="h-3.5 w-3.5" />
        <span>Tactical Combat Card</span>
      </div>
      <RadioGroup value={selectedCard} onValueChange={onSelectCard} className={styles.radioGroup}>
        <div className={styles.radioItem}>
          <RadioGroupItem value="none" id="monster-card-none" />
          <Label htmlFor="monster-card-none" className="cursor-pointer text-xs font-medium">
            Standard Roll (No card)
          </Label>
        </div>
        {data.hasOvercomeCard && (
          <div className={styles.radioItemOvercome}>
            <RadioGroupItem value="overcome" id="monster-card-overcome" />
            <Label htmlFor="monster-card-overcome" className="cursor-pointer text-xs font-semibold text-yellow-300">
              Use &apos;{CardName.Overcome}&apos; (Guaranteed Victory)
            </Label>
          </div>
        )}
        {data.hasWarChiefCard && (
          <div className={styles.radioItemWarChief}>
            <RadioGroupItem value="warchief" id="monster-card-warchief" />
            <Label htmlFor="monster-card-warchief" className="cursor-pointer text-xs font-semibold text-red-300">
              Use &apos;{CardName.WarChief}&apos; (+2 Attack Dice)
            </Label>
          </div>
        )}
        {data.hasDecideCard && (
          <div className={styles.radioItemDecide}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="decide" id="monster-card-decide" />
              <Label htmlFor="monster-card-decide" className="cursor-pointer text-xs font-semibold text-blue-300">
                Use &apos;{CardName.DecideDiceRoll}&apos; (Choose First Die Value)
              </Label>
            </div>
            {selectedCard === 'decide' && (
              <div className={styles.decidedValueContainer}>
                <div className="flex justify-between items-center">
                  <div className={styles.decidedValueLabel}>
                    <Dices className="h-3.5 w-3.5 text-blue-400" />
                    <span>Chosen Value:</span>
                  </div>
                  <span className={styles.decidedValueDisplay}>{decidedValue}</span>
                </div>
                <Slider
                  min={1}
                  max={6}
                  step={1}
                  value={[decidedValue]}
                  onValueChange={(value) => onDecidedValueChange(value[0])}
                />
              </div>
            )}
          </div>
        )}
      </RadioGroup>
    </div>
  );
}
