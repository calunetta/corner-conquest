'use client';

import { useState } from 'react';
import type { KeyboardEvent } from 'react';
import { Input } from '@/components/ui/input';
import { styles } from './TileDecorationEditor.styles';

interface TileDecorationEditorNameFieldProps {
  label: string;
  initialValue: string;
  onSubmit: (name: string) => void;
  onCancel: () => void;
}

/** Inline name entry for Add layout and Rename: Enter confirms a non-blank name, Escape cancels. */
export function TileDecorationEditorNameField({
  label,
  initialValue,
  onSubmit,
  onCancel,
}: TileDecorationEditorNameFieldProps) {
  const [value, setValue] = useState(initialValue);

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Escape') {
      onCancel();
      return;
    }
    const trimmedName = value.trim();
    if (event.key === 'Enter' && trimmedName.length > 0) {
      onSubmit(trimmedName);
    }
  }

  return (
    <Input
      aria-label={label}
      autoFocus
      value={value}
      onChange={(event) => setValue(event.target.value)}
      onKeyDown={handleKeyDown}
      className={styles.nameField}
    />
  );
}
