import { useEffect, useState, type KeyboardEvent } from 'react';
import { usePlayer } from '../../player.provider';
import type { LoginViewProps } from './Login.types';

/** Local commander-name entry. Behavior preserved exactly from the legacy `src/app/page.tsx` `Login`. */
export function useLogin(): LoginViewProps {
  const [isHydrated, setIsHydrated] = useState(false);
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const { setUsername } = usePlayer();

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  const onSubmit = async (): Promise<void> => {
    if (!name.trim()) return;
    setIsLoading(true);

    try {
      const success = await setUsername(name.trim());
      if (!success) {
        setShowErrorDialog(true);
      }
    } catch (error) {
      console.error('Error logging in:', error);
      setShowErrorDialog(true);
    } finally {
      setIsLoading(false);
    }
  };

  const onNameKeyDown = (event: KeyboardEvent<HTMLInputElement>): void => {
    if (event.key === 'Enter') {
      onSubmit();
    }
  };

  return {
    name,
    isLoading,
    isHydrated,
    showErrorDialog,
    onNameChange: setName,
    onNameKeyDown,
    onSubmit,
    onErrorDialogOpenChange: setShowErrorDialog,
  };
}
