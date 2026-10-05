import type { StructuredLogEntry } from '@/lib/types';
import { toGameLogEntries } from './GameLog.map';

describe('toGameLogEntries', () => {
  it('reverses a non-empty array', () => {
    const input = ['first', 'second', 'third'];
    const result = toGameLogEntries(input);
    expect(result).toEqual(['third', 'second', 'first']);
  });

  it('returns empty array for empty input', () => {
    const result = toGameLogEntries([]);
    expect(result).toEqual([]);
  });

  it('returns single entry array unchanged (as single-element reverse)', () => {
    const result = toGameLogEntries(['only']);
    expect(result).toEqual(['only']);
  });

  it('does not mutate the input array', () => {
    const input = ['a', 'b', 'c'];
    const original = [...input];
    toGameLogEntries(input);
    expect(input).toEqual(original);
  });

  it('reverses a list containing both strings and structured entries, unchanged in type/order', () => {
    const structured: StructuredLogEntry = {
      kind: 'structured',
      turn: 2,
      category: 'combat',
      message: 'Player Blue defeated Player Red in battle!',
    };
    const input = ['legacy first', structured, 'legacy third'];
    const result = toGameLogEntries(input);
    expect(result).toEqual(['legacy third', structured, 'legacy first']);
    expect(result[1]).toBe(structured);
  });

  it('handles array with mixed log entry patterns', () => {
    const input = [
      'Player Blue deployed a new army',
      'Player Red upgraded to 2 attack power',
      'Island event: gained 5 Gold',
    ];
    const result = toGameLogEntries(input);
    expect(result).toEqual([
      'Island event: gained 5 Gold',
      'Player Red upgraded to 2 attack power',
      'Player Blue deployed a new army',
    ]);
  });
});
