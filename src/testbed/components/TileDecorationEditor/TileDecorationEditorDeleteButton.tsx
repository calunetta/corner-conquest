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
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { styles } from './TileDecorationEditor.styles';

const SINGLE_LAYOUT_HINT = 'A scenario needs at least one layout';
const DELETE_HINT_ID = 'tile-decoration-editor-delete-hint';

export interface TileDecorationEditorDeleteButtonProps {
  isDirty: boolean;
  canDeleteActiveLayout: boolean;
  scenarioLabel: string;
  layoutName: string;
  onDeleteLayout: () => void;
}

/** Delete opens a confirm dialog. A scenario's last layout can't be deleted: the button stays
 *  disabled, and the reason is both a tooltip and the button's accessible description. */
export function TileDecorationEditorDeleteButton({
  isDirty,
  canDeleteActiveLayout,
  scenarioLabel,
  layoutName,
  onDeleteLayout,
}: TileDecorationEditorDeleteButtonProps) {
  const isDeleteDisabled = isDirty || !canDeleteActiveLayout;

  return (
    <AlertDialog>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={styles.inlineAnchor}>
            <AlertDialogTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isDeleteDisabled}
                aria-describedby={canDeleteActiveLayout ? undefined : DELETE_HINT_ID}
              >
                <Trash2 className={styles.icon} aria-hidden />
                Delete
              </Button>
            </AlertDialogTrigger>
          </span>
        </TooltipTrigger>
        {!canDeleteActiveLayout && <TooltipContent>{SINGLE_LAYOUT_HINT}</TooltipContent>}
      </Tooltip>
      {!canDeleteActiveLayout && (
        <span id={DELETE_HINT_ID} className={styles.srOnly}>
          {SINGLE_LAYOUT_HINT}
        </span>
      )}
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this layout?</AlertDialogTitle>
          <AlertDialogDescription>
            {`This removes "${layoutName}" from ${scenarioLabel} permanently once you save.`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onDeleteLayout}>Delete</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
