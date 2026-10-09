import { useEffect, useState, type KeyboardEvent } from 'react';
import { usePlayer } from '../../player.provider';
import type { LoginErrorDialogState, LoginMode, LoginViewProps } from './Login.types';

const CLOSED_DIALOG: LoginErrorDialogState = { open: false, title: '', description: '' };

const USERNAME_TAKEN_DIALOG: LoginErrorDialogState = {
  open: true,
  title: 'Username Taken',
  description: 'This username is already in use. Please choose a different one.',
};

const SIGN_IN_FAILED_DIALOG: LoginErrorDialogState = {
  open: true,
  title: 'Sign-In Failed',
  description: 'Could not sign in with Google. Please try again.',
};

/** Auth loading wins: while Firebase Auth is still resolving, the form must not flash for the wrong identity. */
function toLoginMode(isAuthLoading: boolean, isGuest: boolean): LoginMode {
  if (isAuthLoading) return 'loading';
  return isGuest ? 'guest' : 'account';
}

/** Commander-name entry and Google sign-in. Name submit behavior is preserved from the legacy `Login`. */
export function useLogin(): LoginViewProps {
  const [isHydrated, setIsHydrated] = useState(false);
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorDialog, setErrorDialog] = useState<LoginErrorDialogState>(CLOSED_DIALOG);
  const { setUsername, signInWithGoogle, isAuthLoading, isGuest } = usePlayer();

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  const onSubmit = async (): Promise<void> => {
    if (!name.trim()) return;
    setIsLoading(true);

    try {
      const success = await setUsername(name.trim());
      if (!success) {
        setErrorDialog(USERNAME_TAKEN_DIALOG);
      }
    } catch (error) {
      console.error('Error logging in:', error);
      setErrorDialog(USERNAME_TAKEN_DIALOG);
    } finally {
      setIsLoading(false);
    }
  };

  const onGoogleSignIn = async (): Promise<void> => {
    setIsLoading(true);

    try {
      const success = await signInWithGoogle();
      if (!success) {
        setErrorDialog(SIGN_IN_FAILED_DIALOG);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const onNameKeyDown = (event: KeyboardEvent<HTMLInputElement>): void => {
    if (event.key === 'Enter') {
      onSubmit();
    }
  };

  const onErrorDialogOpenChange = (open: boolean): void => {
    setErrorDialog((current) => ({ ...current, open }));
  };

  return {
    mode: toLoginMode(isAuthLoading, isGuest),
    name,
    isLoading,
    isHydrated,
    errorDialog,
    onNameChange: setName,
    onNameKeyDown,
    onSubmit,
    onGoogleSignIn,
    onErrorDialogOpenChange,
  };
}
