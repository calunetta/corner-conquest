import { render, screen } from '@testing-library/react';
import { PlayerProvider, usePlayer } from './player.provider';
import { usePlayerProvider } from './player.hook';
import type { PlayerContextType } from './player.types';

jest.mock('./player.hook', () => ({
  usePlayerProvider: jest.fn(),
}));

const mockUsePlayerProvider = usePlayerProvider as jest.Mock;

describe('PlayerProvider and usePlayer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('usePlayer', () => {
    it('throws with the exact message when called outside PlayerProvider', () => {
      const TestComponent = () => {
        usePlayer();
        return <div>Should not render</div>;
      };

      expect(() => {
        render(<TestComponent />);
      }).toThrow('usePlayer must be used within a PlayerProvider');
    });
  });

  describe('PlayerProvider', () => {
    it('renders children', () => {
      const mockContextValue: PlayerContextType = {
        playerId: 'player_123',
        username: 'testuser',
        isGuest: true,
        isAuthLoading: false,
        setUsername: jest.fn(),
        signInWithGoogle: jest.fn(),
        logout: jest.fn(),
      };

      mockUsePlayerProvider.mockReturnValue(mockContextValue);

      render(
        <PlayerProvider>
          <div data-testid="child">Test Child</div>
        </PlayerProvider>
      );

      expect(screen.getByTestId('child')).toBeInTheDocument();
      expect(screen.getByText('Test Child')).toBeInTheDocument();
    });

    it('supplies the hook value to usePlayer consumers', () => {
      const mockContextValue: PlayerContextType = {
        playerId: 'player_456',
        username: 'anotheruser',
        isGuest: true,
        isAuthLoading: false,
        setUsername: jest.fn(),
        signInWithGoogle: jest.fn(),
        logout: jest.fn(),
      };

      mockUsePlayerProvider.mockReturnValue(mockContextValue);

      const TestConsumer = () => {
        const context = usePlayer();
        return (
          <div>
            <div data-testid="playerId">{context.playerId}</div>
            <div data-testid="username">{context.username}</div>
          </div>
        );
      };

      render(
        <PlayerProvider>
          <TestConsumer />
        </PlayerProvider>
      );

      expect(screen.getByTestId('playerId')).toHaveTextContent('player_456');
      expect(screen.getByTestId('username')).toHaveTextContent('anotheruser');
    });

    it('calls usePlayerProvider hook to get the context value', () => {
      const mockContextValue: PlayerContextType = {
        playerId: null,
        username: null,
        isGuest: true,
        isAuthLoading: false,
        setUsername: jest.fn(),
        signInWithGoogle: jest.fn(),
        logout: jest.fn(),
      };

      mockUsePlayerProvider.mockReturnValue(mockContextValue);

      render(
        <PlayerProvider>
          <div>Test</div>
        </PlayerProvider>
      );

      expect(mockUsePlayerProvider).toHaveBeenCalled();
    });
  });
});
