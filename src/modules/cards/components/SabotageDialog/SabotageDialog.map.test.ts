import { PlayerColor } from '@/lib/types';
import type { Player } from '@/lib/types';
import { toSabotageDialogViewModel } from './SabotageDialog.map';

const buildPlayer = (overrides: Partial<Player> & { id: number; playerId: string }): Player =>
  ({
    name: `Player ${overrides.id}`,
    color: PlayerColor.Blue,
    isBot: false,
    armies: [],
    resources: { food: 0, wood: 0, gold: 0 },
    armyCount: 1,
    attackPower: 0,
    nextArmyCost: 6,
    victoryPoints: 0,
    specialCards: [],
    positions: [],
    hasExtraMove: false,
    actionsThisTurn: [],
    passiveAbilities: {},
    isSabotaged: false,
    reinforceActive: false,
    efficientActive: false,
    masterBuilderActive: false,
    revealedTiles: [],
    ...overrides,
  }) as Player;

describe('toSabotageDialogViewModel', () => {
  it('maps each player to a target with id, name, and idle sprite', () => {
    const players = [
      buildPlayer({ id: 0, playerId: 'p0', name: 'Ada', color: PlayerColor.Blue }),
      buildPlayer({ id: 1, playerId: 'p1', name: 'Bo', color: PlayerColor.Red }),
    ];

    const viewModel = toSabotageDialogViewModel(players);

    expect(viewModel).toEqual({
      targets: [
        { id: 0, name: 'Ada', sprite: '/sprites/blue.gif' },
        { id: 1, name: 'Bo', sprite: '/sprites/red.gif' },
      ],
    });
  });

  it('returns an empty targets array for an empty players list', () => {
    expect(toSabotageDialogViewModel([])).toEqual({ targets: [] });
  });

  it('falls back to the blue idle sprite for an unrecognized color', () => {
    const players = [buildPlayer({ id: 2, playerId: 'p2', name: 'Cy', color: 'not-a-real-color' as PlayerColor })];

    expect(toSabotageDialogViewModel(players)).toEqual({
      targets: [{ id: 2, name: 'Cy', sprite: '/sprites/blue_idle.gif' }],
    });
  });

  it('does not mutate the input players array', () => {
    const players = [buildPlayer({ id: 0, playerId: 'p0', name: 'Ada' })];
    const playersCopy = [...players];

    toSabotageDialogViewModel(players);

    expect(players).toEqual(playersCopy);
  });
});
