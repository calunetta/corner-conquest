import { fireEvent, render, screen, within } from '@testing-library/react';
import { LinkGoogleAccountButtonView } from './LinkGoogleAccountButton';
import {
  alreadyLinkedLinkGoogleAccountButton,
  genericFailureLinkGoogleAccountButton,
  idleLinkGoogleAccountButton,
  linkingLinkGoogleAccountButton,
} from './LinkGoogleAccountButton.fixtures';
import type { LinkGoogleAccountButtonViewProps } from './LinkGoogleAccountButton.types';

const DESKTOP_NAME = 'Link Google Account';
const MOBILE_NAME = 'Link your Google account';

function renderButton(overrides: Partial<LinkGoogleAccountButtonViewProps> = {}) {
  return render(<LinkGoogleAccountButtonView {...idleLinkGoogleAccountButton} {...overrides} />);
}

function getDesktopButton() {
  return screen.getByRole('button', { name: DESKTOP_NAME });
}

function getMobileButton() {
  return screen.getByRole('button', { name: MOBILE_NAME });
}

describe('LinkGoogleAccountButtonView', () => {
  describe('idle state', () => {
    it('renders the labelled desktop button and the icon-only mobile button', () => {
      renderButton();

      expect(getDesktopButton()).toBeEnabled();
      expect(getMobileButton()).toBeEnabled();
    });

    it('shows the "Link Google Account" text on the desktop button', () => {
      renderButton();

      expect(getDesktopButton()).toHaveTextContent('Link Google Account');
    });

    it('gives the mobile button an aria-label and no visible text', () => {
      renderButton();

      expect(getMobileButton()).toHaveAccessibleName(MOBILE_NAME);
      expect(getMobileButton().textContent).toBe('');
    });

    it('shows no "Linking…" label', () => {
      renderButton();

      expect(screen.queryByText('Linking…')).not.toBeInTheDocument();
    });

    it('calls onLink when the desktop button is clicked', () => {
      const onLink = jest.fn();
      renderButton({ onLink });

      fireEvent.click(getDesktopButton());

      expect(onLink).toHaveBeenCalledTimes(1);
    });

    it('calls onLink when the mobile button is clicked', () => {
      const onLink = jest.fn();
      renderButton({ onLink });

      fireEvent.click(getMobileButton());

      expect(onLink).toHaveBeenCalledTimes(1);
    });
  });

  describe('linking state', () => {
    it('replaces the desktop label with "Linking…" and disables the desktop button', () => {
      renderButton(linkingLinkGoogleAccountButton);

      expect(screen.queryByRole('button', { name: DESKTOP_NAME })).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Linking…' })).toBeDisabled();
    });

    it('disables the mobile button while linking', () => {
      renderButton(linkingLinkGoogleAccountButton);

      expect(getMobileButton()).toBeDisabled();
    });

    it('does not call onLink when a disabled button is clicked', () => {
      const onLink = jest.fn();
      renderButton({ ...linkingLinkGoogleAccountButton, onLink });

      fireEvent.click(getMobileButton());

      expect(onLink).not.toHaveBeenCalled();
    });
  });

  describe('error dialog', () => {
    it('renders the "Account Already Linked" title and body text when credential-already-in-use is set', () => {
      renderButton(alreadyLinkedLinkGoogleAccountButton);

      const dialog = screen.getByRole('alertdialog');
      expect(within(dialog).getByText('Account Already Linked')).toBeInTheDocument();
      expect(
        within(dialog).getByText(/this google account is already linked to a different corner conquest profile/i),
      ).toBeInTheDocument();
    });

    it('renders the "Linking Failed" title and body text for a generic failure', () => {
      renderButton(genericFailureLinkGoogleAccountButton);

      const dialog = screen.getByRole('alertdialog');
      expect(within(dialog).getByText('Linking Failed')).toBeInTheDocument();
      expect(within(dialog).getByText('Could not link your Google account. Please try again.')).toBeInTheDocument();
    });

    it('renders no alert dialog when errorDialog.open is false', () => {
      renderButton();

      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    });

    it('calls onErrorDialogOpenChange(false) when OK is clicked', () => {
      const onErrorDialogOpenChange = jest.fn();
      renderButton({ ...alreadyLinkedLinkGoogleAccountButton, onErrorDialogOpenChange });

      fireEvent.click(screen.getByRole('button', { name: 'OK' }));

      expect(onErrorDialogOpenChange).toHaveBeenCalledWith(false);
    });
  });
});
