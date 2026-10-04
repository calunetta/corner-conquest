import type { KeyboardEvent } from 'react';

export interface LoginViewProps {
  name: string;
  isLoading: boolean;
  /** True after mount; drives `data-hydrated` on the #username input. */
  isHydrated: boolean;
  showErrorDialog: boolean;
  onNameChange: (value: string) => void;
  onNameKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
  onSubmit: () => void;
  onErrorDialogOpenChange: (open: boolean) => void;
}
