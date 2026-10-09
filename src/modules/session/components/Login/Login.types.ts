import type { KeyboardEvent } from 'react';

/** `loading` while Firebase Auth restores the session; `guest` offers Google sign-in; `account` is a signed-in player choosing their permanent name. */
export type LoginMode = 'loading' | 'guest' | 'account';

export interface LoginErrorDialogState {
  open: boolean;
  title: string;
  description: string;
}

export interface LoginViewProps {
  mode: LoginMode;
  name: string;
  isLoading: boolean;
  /** True after mount; drives `data-hydrated` on the #username input. */
  isHydrated: boolean;
  errorDialog: LoginErrorDialogState;
  onNameChange: (value: string) => void;
  onNameKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
  onSubmit: () => void;
  onGoogleSignIn: () => void;
  onErrorDialogOpenChange: (open: boolean) => void;
}
