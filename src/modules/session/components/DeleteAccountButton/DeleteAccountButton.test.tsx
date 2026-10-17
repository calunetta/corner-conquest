import { createEvent, fireEvent, render, screen } from '@testing-library/react';
import { DeleteAccountButtonView } from './DeleteAccountButton';
import {
  closedDeleteAccountButton,
  confirmDeleteAccountButton,
  deletingDeleteAccountButton,
  errorDeleteAccountButton,
} from './DeleteAccountButton.fixtures';
import type { DeleteAccountButtonViewProps } from './DeleteAccountButton.types';

function renderView(props: DeleteAccountButtonViewProps) {
  const onOpenChange = jest.fn();
  const onConfirmDelete = jest.fn();
  render(<DeleteAccountButtonView {...props} onOpenChange={onOpenChange} onConfirmDelete={onConfirmDelete} />);
  return { onOpenChange, onConfirmDelete };
}

describe('DeleteAccountButtonView', () => {
  it('opens the dialog from the trigger button', () => {
    const { onOpenChange } = renderView(closedDeleteAccountButton);

    fireEvent.click(screen.getByRole('button', { name: 'Delete Account' }));

    expect(onOpenChange).toHaveBeenCalledWith(true);
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  describe('confirm state', () => {
    it('shows the warning with enabled Cancel and Delete Account buttons', () => {
      renderView(confirmDeleteAccountButton);

      expect(screen.getByText('Delete Your Account?')).toBeInTheDocument();
      expect(screen.getByText(/cannot be undone/)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeEnabled();
      expect(screen.getByRole('button', { name: 'Delete Account' })).toBeEnabled();
    });

    it('calls onConfirmDelete and prevents the default close on confirm', () => {
      const { onConfirmDelete } = renderView(confirmDeleteAccountButton);
      const button = screen.getByRole('button', { name: 'Delete Account' });
      const click = createEvent.click(button);

      fireEvent(button, click);

      expect(onConfirmDelete).toHaveBeenCalledTimes(1);
      expect(click.defaultPrevented).toBe(true);
    });
  });

  it('disables Cancel and the action and shows "Deleting…" while deleting', () => {
    renderView(deletingDeleteAccountButton);

    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Deleting…' })).toBeDisabled();
  });

  it('shows the error message and a single OK that closes the dialog', () => {
    const { onOpenChange } = renderView(errorDeleteAccountButton);

    expect(screen.getByText('Deletion Failed')).toBeInTheDocument();
    expect(screen.getByText(errorDeleteAccountButton.errorMessage)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Cancel' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'OK' }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
