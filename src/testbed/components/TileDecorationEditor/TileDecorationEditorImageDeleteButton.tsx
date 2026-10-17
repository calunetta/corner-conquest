'use client';

import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toFileName } from './TileDecorationEditor.display.map';
import { styles } from './TileDecorationEditor.styles';

export interface TileDecorationEditorImageDeleteButtonProps {
  image: string;
  disabled: boolean;
  onConfirm: (image: string) => void;
}

/** Trash icon on a decoration image. Confirming deletes the file and every instance that draws it. */
export function TileDecorationEditorImageDeleteButton({ image, disabled, onConfirm }: TileDecorationEditorImageDeleteButtonProps) {
  const fileName = toFileName(image);

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          type="button"
          variant="destructive"
          size="sm"
          className="w-full"
          disabled={disabled}
          title={disabled ? 'Save or discard your changes first' : undefined}
        >
          <Trash2 className={styles.icon} aria-hidden />
          Delete decoration forever
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {fileName}?</AlertDialogTitle>
          <AlertDialogDescription>
            The file is deleted from public/sprites/decorations/. Every decoration that draws it is removed from every
            layout and variant, so nothing is left pointing at a missing image. This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={() => onConfirm(image)}>Delete forever</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
