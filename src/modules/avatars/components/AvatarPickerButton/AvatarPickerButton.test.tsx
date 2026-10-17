import { fireEvent, render, screen, within } from '@testing-library/react';
import { AvatarPickerButtonView } from './AvatarPickerButton';
import {
  chosenAvatarPicker,
  errorAvatarPicker,
  noAvatarPicker,
  savingAvatarPicker,
} from './AvatarPickerButton.fixtures';
import type { AvatarPickerButtonViewModel } from './AvatarPickerButton.types';

const openPicker = (overrides: Partial<AvatarPickerButtonViewModel> = {}): AvatarPickerButtonViewModel => ({
  ...chosenAvatarPicker,
  isDialogOpen: true,
  ...overrides,
});

// The jest icon mock renders every lucide icon as <span data-testid="lucide-icon-<name>">.
const SPINNER_TEST_ID = 'lucide-icon-loader2';

const TRIGGER_NAME = /change (your )?avatar/i;

const getGrid = () => screen.getByRole('group', { name: 'Avatar picker' });

describe('AvatarPickerButtonView', () => {
  describe('trigger', () => {
    it('shows the "Change Avatar" label', () => {
      render(<AvatarPickerButtonView {...noAvatarPicker} />);

      expect(screen.getByText('Change Avatar')).toBeInTheDocument();
    });

    it('exposes an accessible name containing "Change Avatar"', () => {
      render(<AvatarPickerButtonView {...noAvatarPicker} />);

      expect(screen.getByRole('button', { name: TRIGGER_NAME })).toBeInTheDocument();
    });

    it('does not render the dialog while closed', () => {
      render(<AvatarPickerButtonView {...noAvatarPicker} />);

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('shows the chosen avatar thumbnail only when an avatar is selected', () => {
      const { container, rerender } = render(<AvatarPickerButtonView {...noAvatarPicker} />);
      expect(container.querySelector('button img')).not.toBeInTheDocument();

      rerender(<AvatarPickerButtonView {...chosenAvatarPicker} />);
      expect(container.querySelector('button img')).toBeInTheDocument();
    });

    it('requests the dialog to open when clicked', () => {
      const onOpenChange = jest.fn();
      render(<AvatarPickerButtonView {...noAvatarPicker} onOpenChange={onOpenChange} />);

      fireEvent.click(screen.getByRole('button', { name: TRIGGER_NAME }));

      expect(onOpenChange).toHaveBeenCalledTimes(1);
      expect(onOpenChange).toHaveBeenCalledWith(true);
    });

    it('is reachable by keyboard focus', () => {
      render(<AvatarPickerButtonView {...noAvatarPicker} />);
      const trigger = screen.getByRole('button', { name: TRIGGER_NAME });

      trigger.focus();

      expect(trigger).toHaveFocus();
      expect(trigger).not.toHaveAttribute('tabindex', '-1');
    });
  });

  describe('dialog', () => {
    it('renders the title and description', () => {
      render(<AvatarPickerButtonView {...openPicker()} />);

      const dialog = screen.getByRole('dialog', { name: 'Choose Your Avatar' });
      expect(within(dialog).getByText('Pick the face your commander shows to other players.')).toBeInTheDocument();
    });

    it('renders 25 avatar cells, each with an ordinal label and a stable avatar id', () => {
      render(<AvatarPickerButtonView {...openPicker()} />);

      const cells = within(getGrid()).getAllByRole('button');
      expect(cells).toHaveLength(25);
      cells.forEach((cell, index) => {
        const position = index + 1;
        expect(cell).toHaveAttribute('aria-label', `Avatar ${position} of 25`);
        expect(cell).toHaveAttribute('data-avatar-id', `human-${String(position).padStart(2, '0')}`);
        expect(cell).toHaveAttribute('aria-pressed');
      });
    });

    it('marks only the selected cell as pressed', () => {
      render(<AvatarPickerButtonView {...openPicker()} />);

      const cells = within(getGrid()).getAllByRole('button');
      const pressed = cells.filter((cell) => cell.getAttribute('aria-pressed') === 'true');
      expect(pressed).toHaveLength(1);
      expect(pressed[0]).toHaveAttribute('data-avatar-id', 'human-03');
      expect(pressed[0]).toHaveAttribute('aria-label', 'Avatar 3 of 25');
    });

    it('marks no cell as pressed when no avatar is chosen', () => {
      render(<AvatarPickerButtonView {...openPicker({ ...noAvatarPicker, isDialogOpen: true })} />);

      const cells = within(getGrid()).getAllByRole('button');
      expect(cells.filter((cell) => cell.getAttribute('aria-pressed') === 'true')).toHaveLength(0);
      expect(cells.filter((cell) => cell.getAttribute('aria-pressed') === 'false')).toHaveLength(25);
    });

    it('calls onSelect with the cell id when a cell is clicked', () => {
      const onSelect = jest.fn();
      render(<AvatarPickerButtonView {...openPicker({ onSelect })} />);

      fireEvent.click(screen.getByRole('button', { name: 'Avatar 7 of 25' }));

      expect(onSelect).toHaveBeenCalledTimes(1);
      expect(onSelect).toHaveBeenCalledWith('human-07');
    });

    it('calls onSelect for the already-selected cell too', () => {
      const onSelect = jest.fn();
      render(<AvatarPickerButtonView {...openPicker({ onSelect })} />);

      fireEvent.click(screen.getByRole('button', { name: 'Avatar 3 of 25' }));

      expect(onSelect).toHaveBeenCalledWith('human-03');
    });

    it('moves aria-pressed to the new cell when the selection changes', () => {
      const { rerender } = render(<AvatarPickerButtonView {...openPicker()} />);
      rerender(
        <AvatarPickerButtonView
          {...openPicker({ currentAvatarId: 'human-07', cells: noAvatarPicker.cells.map((c) => ({ ...c, isSelected: c.id === 'human-07' })) })}
        />,
      );

      expect(screen.getByRole('button', { name: 'Avatar 7 of 25' })).toHaveAttribute('aria-pressed', 'true');
      expect(screen.getByRole('button', { name: 'Avatar 3 of 25' })).toHaveAttribute('aria-pressed', 'false');
    });

    it('keeps every cell a plain focusable button (Tab/Enter/Space activation is native)', () => {
      render(<AvatarPickerButtonView {...openPicker()} />);

      within(getGrid())
        .getAllByRole('button')
        .forEach((cell) => {
          expect(cell).toHaveAttribute('type', 'button');
          expect(cell).not.toBeDisabled();
          expect(cell).not.toHaveAttribute('tabindex', '-1');
        });
    });

    it('can move focus to a cell', () => {
      render(<AvatarPickerButtonView {...openPicker()} />);
      const cell = screen.getByRole('button', { name: 'Avatar 1 of 25' });

      cell.focus();

      expect(cell).toHaveFocus();
    });
  });

  describe('Done button', () => {
    it('is enabled when not saving and requests close when clicked', () => {
      const onOpenChange = jest.fn();
      render(<AvatarPickerButtonView {...openPicker({ onOpenChange })} />);
      const done = screen.getByRole('button', { name: 'Done' });

      expect(done).toBeEnabled();
      fireEvent.click(done);

      expect(onOpenChange).toHaveBeenCalledWith(false);
    });

    it('is disabled while saving and does not request close', () => {
      const onOpenChange = jest.fn();
      render(<AvatarPickerButtonView {...savingAvatarPicker} onOpenChange={onOpenChange} />);
      const done = screen.getByRole('button', { name: 'Done' });

      expect(done).toBeDisabled();
      fireEvent.click(done);

      expect(onOpenChange).not.toHaveBeenCalled();
    });
  });

  describe('saving state', () => {
    it('shows a spinner only on the selected cell', () => {
      render(<AvatarPickerButtonView {...savingAvatarPicker} />);

      const cells = within(getGrid()).getAllByRole('button');
      const withSpinner = cells.filter((cell) => within(cell).queryByTestId(SPINNER_TEST_ID) !== null);
      expect(withSpinner).toHaveLength(1);
      expect(withSpinner[0]).toHaveAttribute('data-avatar-id', 'human-03');
    });

    it('shows no spinner when not saving', () => {
      render(<AvatarPickerButtonView {...openPicker()} />);

      const cells = within(getGrid()).getAllByRole('button');
      expect(cells.filter((cell) => within(cell).queryByTestId(SPINNER_TEST_ID) !== null)).toHaveLength(0);
    });
  });

  describe('error state', () => {
    it('announces the save error with role="alert"', () => {
      render(<AvatarPickerButtonView {...errorAvatarPicker} />);

      expect(screen.getByRole('alert')).toHaveTextContent("Couldn't save your avatar. Try again.");
    });

    it('renders no alert when there is no error', () => {
      render(<AvatarPickerButtonView {...openPicker()} />);

      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('keeps the dialog and the grid on screen and Done enabled so the player can retry', () => {
      render(<AvatarPickerButtonView {...errorAvatarPicker} />);

      expect(screen.getByRole('dialog', { name: 'Choose Your Avatar' })).toBeInTheDocument();
      expect(within(getGrid()).getAllByRole('button')).toHaveLength(25);
      expect(screen.getByRole('button', { name: 'Done' })).toBeEnabled();
    });
  });
});
