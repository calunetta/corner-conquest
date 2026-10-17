'use client';

import { type FormEvent } from 'react';
import type { FogVariant } from './TileFog.config';
import { uploadVariant } from './TileFog.preview.api';

const BUTTON_CLASS = 'rounded-md border border-border bg-secondary px-3 py-1.5 text-sm text-foreground disabled:opacity-50';

interface FogVariantUploadFormProps {
  disabled: boolean;
  onUploaded: (variant: FogVariant) => void;
  onError: (message: string) => void;
}

/** Uploads a still PNG and an animated GIF as a new fog variant (written to fog-variants.config.json). */
export function FogVariantUploadForm({ disabled, onUploaded, onError }: FogVariantUploadFormProps) {
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const result = await uploadVariant(new FormData(form));
    if (!result.ok) {
      onError(result.message);
      return;
    }
    form.reset();
    onUploaded(result.value);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3 text-sm text-foreground">
      <label className="flex flex-col gap-1">
        Variant name
        <input name="name" required className="rounded-md border border-border bg-secondary px-2 py-1.5" />
      </label>
      <label className="flex flex-col gap-1">
        Still frame (PNG)
        <input name="still" type="file" accept="image/png" required />
      </label>
      <label className="flex flex-col gap-1">
        Animation (GIF)
        <input name="animation" type="file" accept="image/gif" required />
      </label>
      <button type="submit" disabled={disabled} className={BUTTON_CLASS}>
        Upload variant
      </button>
    </form>
  );
}
