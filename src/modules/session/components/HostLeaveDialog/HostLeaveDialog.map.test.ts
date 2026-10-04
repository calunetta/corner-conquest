import { GameStatus } from '@/lib/types';
import { toHostLeaveDescription } from './HostLeaveDialog.map';

describe('toHostLeaveDescription', () => {
  it('returns the in-progress copy when the game is Playing, regardless of isLastPlayer', () => {
    expect(toHostLeaveDescription(GameStatus.Playing, false)).toBe(
      'You are the host. If you leave a game in progress, the game room will be closed, and the match will end for all players.',
    );
    expect(toHostLeaveDescription(GameStatus.Playing, true)).toBe(
      'You are the host. If you leave a game in progress, the game room will be closed, and the match will end for all players.',
    );
  });

  it('returns the dismantle copy when not Playing and isLastPlayer is true', () => {
    expect(toHostLeaveDescription(GameStatus.Waiting, true)).toBe(
      'You are the only player remaining. If you leave, the game room will be dismantled.',
    );
  });

  it('returns the new-host copy when not Playing and not the last player', () => {
    expect(toHostLeaveDescription(GameStatus.Waiting, false)).toBe(
      'As the host, if you leave now, the next player in line will become the new host.',
    );
  });

  it('returns the new-host copy for Finished status when not the last player', () => {
    expect(toHostLeaveDescription(GameStatus.Finished, false)).toBe(
      'As the host, if you leave now, the next player in line will become the new host.',
    );
  });
});
