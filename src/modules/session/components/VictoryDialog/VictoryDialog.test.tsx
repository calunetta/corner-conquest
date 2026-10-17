import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AVATAR_CATALOG } from '@/modules/avatars';
import { VictoryDialog } from './VictoryDialog';
import { botWinner, humanWinner } from './VictoryDialog.fixtures';

interface RenderOptions {
  isLocalWinner?: boolean;
  isExiting?: boolean;
  onReturnToLobby?: () => void;
}

function renderDialog({ isLocalWinner = true, isExiting = false, onReturnToLobby = jest.fn() }: RenderOptions = {}) {
  return render(
    <VictoryDialog
      winner={humanWinner}
      isLocalWinner={isLocalWinner}
      isExiting={isExiting}
      onReturnToLobby={onReturnToLobby}
    />,
  );
}

describe('VictoryDialog view', () => {
  describe('when the local player is the winner', () => {
    it('renders the "Victory!" title', () => {
      renderDialog({ isLocalWinner: true });

      expect(screen.getByRole('heading', { name: 'Victory!' })).toBeInTheDocument();
    });

    it('renders a subtitle that starts with "You reached"', () => {
      renderDialog({ isLocalWinner: true });

      expect(screen.getByText(/^You reached /)).toBeInTheDocument();
    });
  });

  describe('when another player is the winner', () => {
    it('renders the "Game Over" title', () => {
      renderDialog({ isLocalWinner: false });

      expect(screen.getByRole('heading', { name: 'Game Over' })).toBeInTheDocument();
    });

    it("renders the winner's name in the subtitle", () => {
      renderDialog({ isLocalWinner: false });

      expect(screen.getByText(new RegExp(`^${humanWinner.name} reached `))).toBeInTheDocument();
    });
  });

  describe('bot badge', () => {
    it('renders the BOT badge when the winner is a bot', () => {
      render(
        <VictoryDialog winner={botWinner} isLocalWinner={false} isExiting={false} onReturnToLobby={jest.fn()} />,
      );

      expect(screen.getByText('BOT')).toBeInTheDocument();
    });

    it('does not render the BOT badge when the winner is human', () => {
      renderDialog();

      expect(screen.queryByText('BOT')).not.toBeInTheDocument();
    });
  });

  describe('return button', () => {
    it('renders exactly one button named "Return to Lobby"', () => {
      renderDialog();

      const buttons = screen.getAllByRole('button');
      expect(buttons).toHaveLength(1);
      expect(buttons[0]).toHaveAccessibleName('Return to Lobby');
    });

    it('receives initial focus when the dialog opens', async () => {
      renderDialog();

      await waitFor(() => expect(screen.getByRole('button', { name: 'Return to Lobby' })).toHaveFocus());
    });

    it('calls onReturnToLobby once when clicked', () => {
      const onReturnToLobby = jest.fn();
      renderDialog({ onReturnToLobby });

      fireEvent.click(screen.getByRole('button', { name: 'Return to Lobby' }));

      expect(onReturnToLobby).toHaveBeenCalledTimes(1);
    });

    it('is disabled and shows "Returning…" while exiting, and ignores further clicks', () => {
      const onReturnToLobby = jest.fn();
      renderDialog({ isExiting: true, onReturnToLobby });

      const button = screen.getByRole('button', { name: 'Returning…' });
      expect(button).toBeDisabled();

      fireEvent.click(button);
      expect(onReturnToLobby).not.toHaveBeenCalled();
    });
  });

  describe('dismissal', () => {
    it('keeps the dialog open when Escape is pressed', () => {
      renderDialog();

      fireEvent.keyDown(screen.getByRole('button', { name: 'Return to Lobby' }), { key: 'Escape' });

      expect(screen.getByRole('heading', { name: 'Victory!' })).toBeInTheDocument();
    });
  });
  describe('winner avatar', () => {
    const decodedSrc = (image: HTMLElement) => decodeURI(image.getAttribute('src') ?? '');

    it('renders the chosen avatar image when the winner has an avatar id', () => {
      render(
        <VictoryDialog
          winner={{ ...humanWinner, avatarId: 'human-12' }}
          isLocalWinner
          isExiting={false}
          onReturnToLobby={jest.fn()}
        />,
      );

      expect(decodedSrc(screen.getByRole('img', { name: 'blue player' }))).toBe(AVATAR_CATALOG['human-12'].src);
    });

    it('renders the color sprite when the winner has no avatar id', () => {
      renderDialog();

      expect(decodedSrc(screen.getByRole('img', { name: 'blue player' }))).not.toContain('Human Avatars');
    });
  });
});
