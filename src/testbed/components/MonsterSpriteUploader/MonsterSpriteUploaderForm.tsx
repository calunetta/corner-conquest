'use client';

import { Loader2 } from 'lucide-react';
import Image from 'next/image';
import type { FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { PREVIEW_SPRITE_SIZE_PX, styles } from './MonsterSpriteUploader.styles';
import type { MonsterLevel, MonsterSpriteUploaderViewModel, UploadStatus } from './MonsterSpriteUploader.types';

const SOFT_WARNING_TEXT = 'Boss monsters at level 1-2 can make the center tile easier than usual — this is allowed.';
const STATUS_TEXT: Record<UploadStatus, string> = {
  idle: '',
  submitting: '',
  success: 'Added — catalog regenerated.',
  error: 'Could not add — see console.',
};

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className={styles.fieldError}>
      {message}
    </p>
  );
}

function SpritePreview({ url, alt, placeholder }: { url: string | null; alt: string; placeholder: string }) {
  return (
    <div className={styles.previewColumn}>
      <div className={cn(styles.previewBox, !url && styles.previewBoxEmpty)}>
        {url ? (
          <Image src={url} alt={alt} width={PREVIEW_SPRITE_SIZE_PX} height={PREVIEW_SPRITE_SIZE_PX} className={styles.previewImage} unoptimized />
        ) : (
          placeholder
        )}
      </div>
    </div>
  );
}

type MonsterSpriteUploaderFormProps = Omit<MonsterSpriteUploaderViewModel, 'catalogRows'> & {
  /** Changes once per successful add (the catalog grows), which is exactly when the hook clears the files. */
  fileInputResetKey: number;
};

/** Name/Level/Boss/Idle/Attack fields, the two live previews, the soft warning and the submit row. */
export function MonsterSpriteUploaderForm(props: MonsterSpriteUploaderFormProps) {
  const { name, level, isBoss, levelOptions, status, fieldErrors, canSubmit } = props;
  const isSubmitting = status === 'submitting';
  const hasFieldError = Object.values(fieldErrors).some(Boolean);
  // Remounting clears the native file inputs, which React cannot control; only done after a success.
  const fileInputKey = props.fileInputResetKey;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (canSubmit) props.onSubmit();
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit} aria-labelledby="monster-form-heading">
      <div className={styles.fieldStack}>
        <h3 id="monster-form-heading" className={styles.sectionHeading}>Add a monster</h3>
        <div className={styles.fieldRow}>
          <Label htmlFor="monster-name" className={styles.label}>Name</Label>
          <Input
            id="monster-name"
            value={name}
            disabled={isSubmitting}
            aria-describedby={fieldErrors.name ? 'monster-name-error' : undefined}
            onChange={(event) => props.onNameChange(event.target.value)}
            className={styles.nameField}
          />
          <FieldError id="monster-name-error" message={fieldErrors.name} />
        </div>
        <div className={styles.fieldRow}>
          <Label htmlFor="monster-level" className={styles.label}>Level</Label>
          <Select
            value={level === null ? '' : String(level)}
            disabled={isSubmitting}
            onValueChange={(value) => props.onLevelChange(Number(value) as MonsterLevel)}
          >
            <SelectTrigger id="monster-level" aria-describedby={fieldErrors.level ? 'monster-level-error' : undefined} className={styles.nameField}>
              <SelectValue placeholder="Select level" />
            </SelectTrigger>
            <SelectContent>
              {levelOptions.map((option) => (
                <SelectItem key={option.value} value={String(option.value)}>{option.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldError id="monster-level-error" message={fieldErrors.level} />
        </div>
        <div className={styles.fieldRow}>
          <div className={styles.bossRow}>
            <Label htmlFor="monster-boss" className={styles.label}>Boss (center-tile eligible)</Label>
            <Switch id="monster-boss" checked={isBoss} disabled={isSubmitting} onCheckedChange={props.onBossToggle} />
          </div>
          <p role="status" aria-live="polite" className={styles.softWarning}>
            {props.showsBossSoftWarning ? SOFT_WARNING_TEXT : ''}
          </p>
        </div>
        <div className={styles.fieldRow}>
          <Label htmlFor="monster-idle" className={styles.label}>Idle sprite (required)</Label>
          <input
            key={fileInputKey}
            id="monster-idle"
            type="file"
            accept="image/gif"
            aria-label="Idle sprite"
            disabled={isSubmitting}
            aria-describedby={fieldErrors.idle ? 'monster-idle-error' : undefined}
            onChange={(event) => props.onIdleFileChange(event.target.files?.[0] ?? null)}
            className={styles.fileInput}
          />
          <FieldError id="monster-idle-error" message={fieldErrors.idle} />
        </div>
        <div className={styles.fieldRow}>
          <Label htmlFor="monster-attack" className={styles.label}>Attack sprite (optional)</Label>
          <input
            key={fileInputKey}
            id="monster-attack"
            type="file"
            accept="image/gif"
            aria-label="Attack sprite"
            disabled={isSubmitting}
            aria-describedby={fieldErrors.attack ? 'monster-attack-error' : undefined}
            onChange={(event) => props.onAttackFileChange(event.target.files?.[0] ?? null)}
            className={styles.fileInput}
          />
          <FieldError id="monster-attack-error" message={fieldErrors.attack} />
        </div>
        <div className={styles.submitRow}>
          <Button type="submit" size="sm" disabled={!canSubmit}>
            {isSubmitting && <Loader2 className={styles.spinner} aria-hidden />}
            {isSubmitting ? 'Adding…' : 'Add monster'}
          </Button>
          <p role="status" className={styles.statusText({ status })}>
            {status === 'error' && hasFieldError ? '' : STATUS_TEXT[status]}
          </p>
        </div>
      </div>
      <div className={styles.previewRow}>
        <SpritePreview url={props.idlePreviewUrl} alt="Idle preview" placeholder="No idle sprite" />
        <SpritePreview url={props.attackPreviewUrl} alt="Attack preview" placeholder="No attack sprite" />
      </div>
    </form>
  );
}
