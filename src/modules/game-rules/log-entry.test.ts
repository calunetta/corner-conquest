import type { GameState, StructuredLogEntry } from '@/lib/types';
import { pushLogEntry, toLogMessage } from './log-entry';

function buildState(turn: number): GameState {
  return { turn, log: [] } as unknown as GameState;
}

describe('pushLogEntry', () => {
  it('stamps kind: "structured" and turn: state.turn', () => {
    const state = buildState(5);

    pushLogEntry(state, { category: 'economy', message: 'Player Blue gained 2 Gold' });

    expect(state.log).toHaveLength(1);
    expect(state.log[0]).toMatchObject({ kind: 'structured', turn: 5 });
  });

  it('stamps turn: 0 for pre-game entries (boundary)', () => {
    const state = buildState(0);

    pushLogEntry(state, { category: 'system', message: 'Player Red has joined the game.' });

    expect(state.log[0]).toMatchObject({ kind: 'structured', turn: 0 });
  });

  it('passes category, message, playerId, targetPlayerId, isMilestone and isPassive through unchanged', () => {
    const state = buildState(3);

    pushLogEntry(state, {
      category: 'combat',
      message: 'Player Blue defeated Player Red in battle!',
      playerId: 'p1',
      targetPlayerId: 'p2',
      isMilestone: true,
      isPassive: false,
    });

    expect(state.log[0]).toEqual({
      kind: 'structured',
      turn: 3,
      category: 'combat',
      message: 'Player Blue defeated Player Red in battle!',
      playerId: 'p1',
      targetPlayerId: 'p2',
      isMilestone: true,
      isPassive: false,
    });
  });

  it('omits optional fields that are not provided (invalid/empty input)', () => {
    const state = buildState(1);

    pushLogEntry(state, { category: 'turn', message: "It's now Player Blue's turn." });

    expect(state.log[0]).toEqual({
      kind: 'structured',
      turn: 1,
      category: 'turn',
      message: "It's now Player Blue's turn.",
    });
  });

  it('appends to existing entries without mutating earlier ones', () => {
    const state = buildState(2);
    state.log.push('legacy entry');

    pushLogEntry(state, { category: 'economy', message: 'Player Red collected resources' });

    expect(state.log).toHaveLength(2);
    expect(state.log[0]).toBe('legacy entry');
  });
});

describe('toLogMessage', () => {
  it('returns the string as-is for a plain legacy string entry', () => {
    expect(toLogMessage('Player Blue deployed a new army')).toBe('Player Blue deployed a new army');
  });

  it('returns the empty string as-is (boundary: empty string entry)', () => {
    expect(toLogMessage('')).toBe('');
  });

  it('returns .message for a structured entry', () => {
    const entry: StructuredLogEntry = {
      kind: 'structured',
      turn: 4,
      category: 'cards',
      message: 'Player Blue bought a card',
    };

    expect(toLogMessage(entry)).toBe('Player Blue bought a card');
  });
});
