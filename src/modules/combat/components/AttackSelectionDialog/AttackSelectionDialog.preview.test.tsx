import { render, screen, fireEvent } from '@testing-library/react';
import { attackSelectionDialogPreview } from './AttackSelectionDialog.preview';

describe('AttackSelectionDialog preview states', () => {
  attackSelectionDialogPreview.states.forEach(({ name, render: renderState }) => {
    describe(`state: ${name}`, () => {
      it('opens with the dialog visible', () => {
        render(renderState());
        expect(screen.getByText(/Select Enemy Target/i)).toBeInTheDocument();
      });

      it('closes when the close button is clicked and shows a reopen trigger', () => {
        render(renderState());
        const closeButton = screen.getByRole('button', { name: /Close preview/i, hidden: true });
        expect(closeButton).toBeInTheDocument();
        fireEvent.click(closeButton);
        expect(screen.queryByRole('button', { name: /Cancel/i })).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Reopen dialog/i })).toBeInTheDocument();
      });

      it('closes when Cancel is clicked and shows a reopen trigger', () => {
        render(renderState());
        const cancelButton = screen.getByRole('button', { name: /Cancel/i });
        expect(cancelButton).toBeInTheDocument();
        fireEvent.click(cancelButton);
        expect(screen.queryByRole('button', { name: /Cancel/i })).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Reopen dialog/i })).toBeInTheDocument();
      });

      it('reopens when the reopen button is clicked', () => {
        render(renderState());
        const closeButton = screen.getByRole('button', { name: /Close preview/i, hidden: true });
        fireEvent.click(closeButton);
        const reopenButton = screen.getByRole('button', { name: /Reopen dialog/i });
        fireEvent.click(reopenButton);
        expect(screen.getByRole('button', { name: /Cancel/i })).toBeInTheDocument();
      });
    });
  });
});
