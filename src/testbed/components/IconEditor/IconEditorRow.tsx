'use client';

import type { ChangeEvent } from 'react';
import Image from 'next/image';
import * as LucideIcons from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getLucideGlyph, toIconTransform, type IconDefaultSource } from '@/modules/icons';
import { styles } from './IconEditor.styles';
import type { IconRowViewModel } from './IconEditor.types';
import { IconField } from './IconEditorField';

const ROTATION_RANGE = { min: 0, max: 359, step: 1 } as const;
const SIZE_RANGE = { min: 25, max: 200, step: 5 } as const;
const IMAGE_ACCEPT = 'image/png,image/jpeg,image/gif,image/webp';
const UPLOAD_ERROR_TEXT = 'Could not upload — check the file type and try again.';

function IconGlyph({ source }: { source: IconDefaultSource }) {
  if (source.kind === 'image') {
    return <Image src={source.src} alt="" fill unoptimized className={styles.thumbnailImage} />;
  }

  const Glyph = getLucideGlyph(source.name);
  if (!Glyph) return null;
  return <Glyph aria-hidden className={styles.thumbnailGlyph} />;
}

export function IconEditorRow({
  label,
  currentSource,
  rotation,
  size,
  hasSavedOverride,
  isDirty,
  isUploading,
  uploadError,
  onRotationChange,
  onSizeChange,
  onUpload,
  onReset,
}: IconRowViewModel) {
  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    // Clearing the value lets the developer pick the same file again after a failed upload.
    event.target.value = '';
    if (file) onUpload(file);
  }

  return (
    <div className={styles.row}>
      <div className={styles.thumbnailFrame}>
        <div className={styles.thumbnailTransform} style={{ transform: toIconTransform(rotation, size) }}>
          <IconGlyph source={currentSource} />
        </div>
      </div>

      <div className={styles.controls}>
        <div className={styles.rowHeader}>
          <span className={styles.rowLabel}>{label}</span>
          <div className={styles.badgeRow}>
            {hasSavedOverride && <Badge variant="outline" className={styles.overriddenBadge}>Overridden</Badge>}
            {isDirty && <Badge variant="outline" className={styles.unsavedBadge}>Unsaved changes</Badge>}
          </div>
        </div>

        <div className={styles.uploadRow}>
          <Button asChild size="sm" variant="outline">
            <label className={styles.uploadButton}>
              {isUploading ? (
                <LucideIcons.Loader2 className={styles.spinner} aria-hidden />
              ) : (
                <LucideIcons.Upload className={styles.icon} aria-hidden />
              )}
              {isUploading ? 'Uploading…' : 'Upload image'}
              <input
                type="file"
                accept={IMAGE_ACCEPT}
                className={styles.fileInput}
                disabled={isUploading}
                onChange={handleFileChange}
              />
            </label>
          </Button>
          {hasSavedOverride && (
            <Button type="button" variant="outline" size="sm" onClick={onReset}>
              <LucideIcons.RotateCcw className={styles.icon} aria-hidden />
              Reset to default
            </Button>
          )}
        </div>
        {uploadError && <p className={styles.uploadError}>{UPLOAD_ERROR_TEXT}</p>}

        <IconField
          fieldLabel="Rotation (degrees)"
          inputAriaLabel={`Rotation for ${label} icon, degrees`}
          sliderAriaLabel={`Rotation for ${label} icon, degrees`}
          value={rotation}
          range={ROTATION_RANGE}
          onValueChange={onRotationChange}
        />
        <IconField
          fieldLabel="Size (% of default)"
          inputAriaLabel={`Size for ${label} icon, percent of default`}
          sliderAriaLabel={`Size for ${label} icon, percent of default`}
          value={size}
          range={SIZE_RANGE}
          onValueChange={onSizeChange}
        />
      </div>
    </div>
  );
}
