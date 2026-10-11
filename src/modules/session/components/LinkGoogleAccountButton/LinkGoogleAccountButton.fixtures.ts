import type { LinkGoogleAccountButtonViewProps } from './LinkGoogleAccountButton.types';

/** Shared by the tests and the testbed preview. Deterministic: no random values or dates. */
const noop = (): void => undefined;

const closedDialog = { open: false, title: '', description: '' };

export const idleLinkGoogleAccountButton: LinkGoogleAccountButtonViewProps = {
  isLinking: false,
  errorDialog: closedDialog,
  onLink: noop,
  onErrorDialogOpenChange: noop,
};

export const linkingLinkGoogleAccountButton: LinkGoogleAccountButtonViewProps = {
  ...idleLinkGoogleAccountButton,
  isLinking: true,
};

export const alreadyLinkedLinkGoogleAccountButton: LinkGoogleAccountButtonViewProps = {
  ...idleLinkGoogleAccountButton,
  errorDialog: {
    open: true,
    title: 'Account Already Linked',
    description:
      'This Google account is already linked to a different Corner Conquest profile. Sign out and sign in with that Google account instead, or link a different one.',
  },
};

export const genericFailureLinkGoogleAccountButton: LinkGoogleAccountButtonViewProps = {
  ...idleLinkGoogleAccountButton,
  errorDialog: {
    open: true,
    title: 'Linking Failed',
    description: 'Could not link your Google account. Please try again.',
  },
};
