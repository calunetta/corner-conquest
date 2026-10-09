import type { ComponentPreview } from '@/testbed';
import { LoginView } from './Login';
import { accountLoginProps, guestLoginProps, loadingLoginProps } from './Login.fixtures';

export const loginPreview: ComponentPreview = {
  slug: 'session-login',
  title: 'Login',
  group: 'Session',
  states: [
    { name: 'Loading', render: () => <LoginView {...loadingLoginProps} /> },
    { name: 'Guest', render: () => <LoginView {...guestLoginProps} /> },
    { name: 'Account', render: () => <LoginView {...accountLoginProps} /> },
  ],
};
