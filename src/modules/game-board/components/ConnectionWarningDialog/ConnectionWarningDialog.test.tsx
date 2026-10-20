import { fireEvent, render, screen, within } from '@testing-library/react';
import { ConnectionWarningDialogView } from './ConnectionWarningDialog';
import {
  dismissingViewModel,
  openExpiringViewModel,
  openWarningViewModel,
} from './ConnectionWarningDialog.fixtures';
import type { ConnectionWarningViewModel } from './ConnectionWarningDialog.types';

const closedViewModel: ConnectionWarningViewModel = {
  isOpen: false,
  isExpiring: false,
  countdownLabel: 'Taking over in 0:18',
  isDismissing: false,
  onDismiss: () => {},
};

describe('ConnectionWarningDialogView', () => {
  describe('when closed', () => {
    it('renders no alert dialog', () => {
      render(<ConnectionWarningDialogView {...closedViewModel} />);

      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    });
  });

  describe('when open', () => {
    it('announces itself as an alert dialog named "Connection lost"', () => {
      render(<ConnectionWarningDialogView {...openWarningViewModel} />);

      expect(screen.getByRole('alertdialog', { name: 'Connection lost' })).toBeInTheDocument();
    });

    it('shows the body copy that tells the player a bot will take over', () => {
      render(<ConnectionWarningDialogView {...openWarningViewModel} />);

      expect(
        screen.getByText(
          "We haven't heard from you in a while. Reconnect now or a bot will take over your seat."
        )
      ).toBeInTheDocument();
    });

    it('shows the countdown label from the view model', () => {
      render(<ConnectionWarningDialogView {...openWarningViewModel} />);

      expect(screen.getByText('Taking over in 0:18')).toBeInTheDocument();
    });

    it('shows the wifi-off icon next to the title', () => {
      render(<ConnectionWarningDialogView {...openWarningViewModel} />);

      expect(screen.getByTestId('registry-icon-wifi-off')).toBeInTheDocument();
    });

    it('offers a single enabled "I\'m back" button with the refresh icon', () => {
      render(<ConnectionWarningDialogView {...openWarningViewModel} />);

      const button = screen.getByRole('button', { name: "I'm back" });
      expect(button).toBeEnabled();
      expect(within(button).getByTestId('registry-icon-refresh-cw')).toBeInTheDocument();
      expect(screen.getAllByRole('button')).toHaveLength(1);
    });

    it('calls onDismiss once when "I\'m back" is clicked', () => {
      const onDismiss = jest.fn();
      render(<ConnectionWarningDialogView {...openWarningViewModel} onDismiss={onDismiss} />);

      fireEvent.click(screen.getByRole('button', { name: "I'm back" }));

      expect(onDismiss).toHaveBeenCalledTimes(1);
    });

    it('shows a disabled "Checking…" button with the spinner while the check is in flight', () => {
      render(<ConnectionWarningDialogView {...dismissingViewModel} />);

      const button = screen.getByRole('button', { name: 'Checking…' });
      expect(button).toBeDisabled();
      expect(within(button).getByTestId('registry-icon-loader-2')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: "I'm back" })).not.toBeInTheDocument();
    });

    it('does not call onDismiss again while a check is already in flight', () => {
      const onDismiss = jest.fn();
      render(
        <ConnectionWarningDialogView {...dismissingViewModel} onDismiss={onDismiss} />
      );

      fireEvent.click(screen.getByRole('button', { name: 'Checking…' }));

      expect(onDismiss).not.toHaveBeenCalled();
    });

    it('keeps the dialog open while the check is in flight', () => {
      render(<ConnectionWarningDialogView {...dismissingViewModel} />);

      expect(screen.getByRole('alertdialog', { name: 'Connection lost' })).toBeInTheDocument();
      expect(screen.getByText('Taking over in 0:18')).toBeInTheDocument();
    });

    it('stays open after Escape is pressed', () => {
      render(<ConnectionWarningDialogView {...openWarningViewModel} />);

      fireEvent.keyDown(screen.getByRole('alertdialog'), { key: 'Escape' });

      expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    });

    it('stays open after a pointer press outside the dialog', () => {
      render(<ConnectionWarningDialogView {...openWarningViewModel} />);

      fireEvent.pointerDown(document.body);
      fireEvent.click(document.body);

      expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    });

    it('shows the expiring countdown label once under 10 seconds remain', () => {
      render(<ConnectionWarningDialogView {...openExpiringViewModel} />);

      expect(screen.getByRole('alertdialog', { name: 'Connection lost' })).toBeInTheDocument();
      expect(screen.getByText('Taking over in 0:07')).toBeInTheDocument();
    });

    it('shows the zero countdown and keeps the dialog open until the seat converts', () => {
      render(
        <ConnectionWarningDialogView
          isOpen
          isExpiring
          countdownLabel="Taking over in 0:00"
          isDismissing={false}
          onDismiss={() => {}}
        />
      );

      expect(screen.getByText('Taking over in 0:00')).toBeInTheDocument();
      expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    });
  });

  describe('when the open state changes', () => {
    it('removes the dialog once the view model reports it closed', () => {
      const { rerender } = render(<ConnectionWarningDialogView {...openWarningViewModel} />);

      rerender(<ConnectionWarningDialogView {...closedViewModel} />);

      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    });

    it('updates the countdown text when the label changes', () => {
      const { rerender } = render(<ConnectionWarningDialogView {...openWarningViewModel} />);

      rerender(<ConnectionWarningDialogView {...openExpiringViewModel} />);

      expect(screen.queryByText('Taking over in 0:18')).not.toBeInTheDocument();
      expect(screen.getByText('Taking over in 0:07')).toBeInTheDocument();
    });
  });
});
