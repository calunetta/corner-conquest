import type { PreviewState } from '../../testbed.types';
import { selectStates, toKebabCase } from './PreviewStage.map';

const states: PreviewState[] = [
  { name: 'Default', render: () => null },
  { name: 'Zoomed in', render: () => null },
];

describe('selectStates', () => {
  it('returns every state when no state is requested', () => {
    expect(selectStates(states)).toBe(states);
  });

  it('returns only the requested state, ignoring case', () => {
    expect(selectStates(states, 'zoomed IN')).toEqual([states[1]]);
  });

  it('returns no states for an unknown name', () => {
    expect(selectStates(states, 'Missing')).toEqual([]);
  });
});

describe('toKebabCase', () => {
  it.each([
    ['Zoomed in', 'zoomed-in'],
    ['  Plenty of time! ', 'plenty-of-time'],
    ['HUD / Timer', 'hud-timer'],
  ])('turns %p into %p', (input, expected) => {
    expect(toKebabCase(input)).toBe(expected);
  });
});
