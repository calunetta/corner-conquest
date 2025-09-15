'use client';
import { SPECIAL_CARD_DESCRIPTIONS } from '@/lib/card-data';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

type UseCardDialogProps = {
  cardName: string;
  onConfirm: () => void;
  onClose: () => void;
};

export function UseCardDialog({ cardName, onConfirm, onClose }: UseCardDialogProps) {
  const description = SPECIAL_CARD_DESCRIPTIONS[cardName] || 'No description available.';

  return (
    <AlertDialog open={true} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Use '{cardName}'?</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>Confirm</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
