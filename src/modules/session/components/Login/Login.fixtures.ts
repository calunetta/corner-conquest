import type { LoginViewProps } from './Login.types';

const noop = (): void => undefined;

/** Shared by the view tests and the testbed preview. Deterministic: no random values or dates. */
const baseLoginProps: Omit<LoginViewProps, 'mode'> = {
  name: '',
  isLoading: false,
  isHydrated: true,
  errorDialog: { open: false, title: '', description: '' },
  onNameChange: noop,
  onNameKeyDown: noop,
  onSubmit: noop,
  onGoogleSignIn: noop,
  onErrorDialogOpenChange: noop,
};

export const loadingLoginProps: LoginViewProps = { ...baseLoginProps, mode: 'loading' };

export const guestLoginProps: LoginViewProps = { ...baseLoginProps, mode: 'guest' };

export const accountLoginProps: LoginViewProps = { ...baseLoginProps, mode: 'account' };
