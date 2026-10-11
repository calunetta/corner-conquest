'use client';

import { Loader2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { GoogleIcon } from '../GoogleIcon';
import { styles } from './LinkGoogleAccountButton.styles';
import type { LinkGoogleAccountButtonViewProps } from './LinkGoogleAccountButton.types';

const LINKING_LABEL = 'Linking…';
const MOBILE_ARIA_LABEL = 'Link your Google account';

/**
 * Pure view: the desktop labelled button and the mobile icon-only button are both rendered and
 * CSS (`hidden sm:inline-flex` / `sm:hidden`) picks one, so no viewport hook is needed.
 */
export function LinkGoogleAccountButtonView({
  isLinking,
  errorDialog,
  onLink,
  onErrorDialogOpenChange,
}: LinkGoogleAccountButtonViewProps) {
  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className={styles.desktopButton}
        onClick={onLink}
        disabled={isLinking}
      >
        {isLinking ? <Loader2 className={styles.spinnerIcon} aria-hidden /> : <GoogleIcon className={styles.icon} />}
        {isLinking ? LINKING_LABEL : 'Link Google Account'}
      </Button>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className={styles.mobileButton}
        onClick={onLink}
        disabled={isLinking}
        aria-label={MOBILE_ARIA_LABEL}
      >
        {isLinking ? (
          <Loader2 className={styles.mobileSpinnerIcon} aria-hidden />
        ) : (
          <GoogleIcon className={styles.mobileIcon} />
        )}
      </Button>

      <AlertDialog open={errorDialog.open} onOpenChange={onErrorDialogOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{errorDialog.title}</AlertDialogTitle>
            <AlertDialogDescription>{errorDialog.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => onErrorDialogOpenChange(false)}>OK</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
