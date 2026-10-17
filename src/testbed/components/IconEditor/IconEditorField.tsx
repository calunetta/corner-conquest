'use client';

import { useState } from 'react';
import type { ChangeEvent } from 'react';
import * as SliderPrimitive from '@radix-ui/react-slider';
import { Input } from '@/components/ui/input';
import { styles } from './IconEditor.styles';

interface IconSliderProps {
  ariaLabel: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onValueChange: (value: number) => void;
}

/** Radix's Slider.Root does not forward aria-label to its thumb (the element with role="slider"),
 *  so the thumb is composed here and labelled directly. The class strings mirror
 *  src/components/ui/slider.tsx. */
function IconSlider({ ariaLabel, value, min, max, step, onValueChange }: IconSliderProps) {
  return (
    <SliderPrimitive.Root
      className={styles.sliderRoot}
      value={[value]}
      min={min}
      max={max}
      step={step}
      onValueChange={([next]) => onValueChange(next)}
    >
      <SliderPrimitive.Track className={styles.sliderTrack}>
        <SliderPrimitive.Range className={styles.sliderRange} />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb className={styles.sliderThumb} aria-label={ariaLabel} />
    </SliderPrimitive.Root>
  );
}

interface IconNumberInputProps {
  ariaLabel: string;
  value: number;
  range: { min: number; max: number; step: number };
  onValueChange: (value: number) => void;
}

/** Holds the raw typed text while focused and commits on blur only. Committing per keystroke
 *  would clamp an empty field to the minimum at once, so the developer could never clear and
 *  retype a value. The hook's onValueChange clamps the committed number. */
function IconNumberInput({ ariaLabel, value, range, onValueChange }: IconNumberInputProps) {
  const [draftText, setDraftText] = useState<string | null>(null);

  function commitDraft() {
    if (draftText !== null && draftText.trim() !== '' && Number.isFinite(Number(draftText))) {
      onValueChange(Number(draftText));
    }
    setDraftText(null);
  }

  return (
    <Input
      type="number"
      aria-label={ariaLabel}
      className={styles.numberInput}
      min={range.min}
      max={range.max}
      step={range.step}
      value={draftText ?? value}
      onChange={(event: ChangeEvent<HTMLInputElement>) => setDraftText(event.target.value)}
      onBlur={commitDraft}
    />
  );
}

interface IconFieldProps {
  fieldLabel: string;
  inputAriaLabel: string;
  sliderAriaLabel: string;
  value: number;
  range: { min: number; max: number; step: number };
  onValueChange: (value: number) => void;
}

/** A visible field caption, a number input for exact values and a slider for dragging. Both
 *  write through the same handler, so the hook's clamp applies to either (the input on blur,
 *  the slider on every change). */
export function IconField({ fieldLabel, inputAriaLabel, sliderAriaLabel, value, range, onValueChange }: IconFieldProps) {
  return (
    <div className={styles.field}>
      <div className={styles.fieldHeader}>
        <span className={styles.fieldLabel}>{fieldLabel}</span>
        <IconNumberInput ariaLabel={inputAriaLabel} value={value} range={range} onValueChange={onValueChange} />
      </div>
      <IconSlider
        ariaLabel={sliderAriaLabel}
        value={value}
        min={range.min}
        max={range.max}
        step={range.step}
        onValueChange={onValueChange}
      />
    </div>
  );
}
