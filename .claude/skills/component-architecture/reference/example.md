# Worked example: `PlayerStandings`

A complete component in the new structure. Every file below was type-checked, linted, unit-tested and
screenshot-verified in the testbed before it was copied here, then removed from `src/` (it is a reference,
not a shipped feature). Copy its shape, not its content.

```
src/modules/hud/
├── index.ts                                  module public API
└── components/PlayerStandings/
    ├── PlayerStandings.tsx                   PlayerStandingsView (pure) + PlayerStandings (connected)
    ├── PlayerStandings.hook.ts               reads the legacy board context, returns the view model
    ├── PlayerStandings.map.ts                pure transforms: ranking with ties, progress
    ├── PlayerStandings.styles.ts             every Tailwind class, cva for variants
    ├── PlayerStandings.types.ts              view model shared by map, hook, view
    ├── PlayerStandings.fixtures.ts           deterministic data shared by tests and preview
    ├── PlayerStandings.map.test.ts           tester-a, first
    ├── PlayerStandings.hook.test.ts          tester-a, second
    ├── PlayerStandings.test.tsx              tester-b, view behaviour through roles and ARIA
    ├── PlayerStandings.preview.tsx           testbed states, registered in src/testbed/registry.ts
    └── index.ts                              component public API
```

Wiring it into the legacy board would be one import in the legacy parent:
`import { PlayerStandings } from '@/modules/hud';` and `<PlayerStandings />` inside the `GameBoardProvider` tree.
Registering the preview is an import plus an entry in the `previews` array of `src/testbed/registry.ts`:
`import { playerStandingsPreview } from '@/modules/hud/components/PlayerStandings/PlayerStandings.preview';`

## `PlayerStandings.types.ts`

```ts
import type { PlayerColor } from '@/lib/types';

export interface StandingRow {
  playerId: number;
  name: string;
  color: PlayerColor;
  victoryPoints: number;
  /** Share of the victory point goal reached, 0–100. */
  progressPercent: number;
  /** 1 = leading. Tied players share a rank. */
  rank: number;
  isLocalPlayer: boolean;
}

export interface PlayerStandingsViewModel {
  victoryPointGoal: number;
  rows: StandingRow[];
}
```

## `PlayerStandings.map.ts`

```ts
import type { Player } from '@/lib/types';
import type { PlayerStandingsViewModel, StandingRow } from './PlayerStandings.types';

const FULL_PROGRESS = 100;

export function toProgressPercent(victoryPoints: number, victoryPointGoal: number): number {
  if (victoryPointGoal <= 0) return FULL_PROGRESS;
  return Math.min(FULL_PROGRESS, Math.round((victoryPoints / victoryPointGoal) * FULL_PROGRESS));
}

/** Orders players by victory points, highest first. Tied players share a rank (1, 1, 3). */
export function toPlayerStandings(
  players: Player[],
  victoryPointGoal: number,
  localPlayerId: number,
): PlayerStandingsViewModel {
  const byVictoryPoints = [...players].sort((a, b) => b.victoryPoints - a.victoryPoints);

  const rows = byVictoryPoints.map(
    (player): StandingRow => ({
      playerId: player.id,
      name: player.name,
      color: player.color,
      victoryPoints: player.victoryPoints,
      progressPercent: toProgressPercent(player.victoryPoints, victoryPointGoal),
      rank: 1 + byVictoryPoints.filter((other) => other.victoryPoints > player.victoryPoints).length,
      isLocalPlayer: player.id === localPlayerId,
    }),
  );

  return { victoryPointGoal, rows };
}
```

## `PlayerStandings.hook.ts`

```ts
import { useGameBoard } from '@/features/game/context/GameBoardContext';
import { toPlayerStandings } from './PlayerStandings.map';
import type { PlayerStandingsViewModel } from './PlayerStandings.types';

/** Adapts the legacy game board context into what the standings view renders. */
export function usePlayerStandings(): PlayerStandingsViewModel {
  const { gameState, localPlayer } = useGameBoard();

  return toPlayerStandings(gameState.players, gameState.settings.victoryPointGoal, localPlayer.id);
}
```

## `PlayerStandings.styles.ts`

```ts
import { cva } from 'class-variance-authority';
import type { PlayerColor } from '@/lib/types';

export const styles = {
  root: 'flex w-64 flex-col gap-2 rounded-xl border border-white/10 bg-black/60 p-3 shadow-lg backdrop-blur-md',
  title: 'text-xs font-semibold uppercase tracking-widest text-muted-foreground',
  list: 'flex flex-col gap-1.5',
  row: cva('flex items-center gap-2 rounded-lg px-2 py-1 text-sm', {
    variants: {
      isLocalPlayer: { true: 'bg-primary/15 ring-1 ring-primary/40', false: '' },
    },
  }),
  rank: 'w-4 text-right font-mono text-xs text-muted-foreground',
  colorDot: 'h-2.5 w-2.5 shrink-0 rounded-full',
  name: 'flex-1 truncate font-semibold text-foreground',
  points: 'font-mono text-xs font-bold text-accent',
  track: 'h-1.5 w-14 overflow-hidden rounded-full bg-white/10',
  fill: 'block h-full rounded-full bg-primary transition-[width] duration-500 motion-reduce:transition-none',
} as const;

export const colorDotByPlayerColor: Record<PlayerColor, string> = {
  blue: 'bg-blue-500',
  red: 'bg-red-500',
  purple: 'bg-purple-500',
  yellow: 'bg-yellow-400',
};
```

## `PlayerStandings.tsx`

```tsx
'use client';

import { cn } from '@/lib/utils';
import { usePlayerStandings } from './PlayerStandings.hook';
import { colorDotByPlayerColor, styles } from './PlayerStandings.styles';
import type { PlayerStandingsViewModel } from './PlayerStandings.types';

/** Pure view: everything comes from props, so tests and previews need no providers. */
export function PlayerStandingsView({ victoryPointGoal, rows }: PlayerStandingsViewModel) {
  return (
    <section className={styles.root} aria-label="Standings">
      <h2 className={styles.title}>Race to {victoryPointGoal} VP</h2>
      <ol className={styles.list}>
        {rows.map((row) => (
          <li
            key={row.playerId}
            className={styles.row({ isLocalPlayer: row.isLocalPlayer })}
            aria-current={row.isLocalPlayer ? 'true' : undefined}
          >
            <span className={styles.rank}>{row.rank}</span>
            <span className={cn(styles.colorDot, colorDotByPlayerColor[row.color])} aria-hidden />
            <span className={styles.name}>{row.name}</span>
            <span className={styles.points}>{row.victoryPoints}</span>
            <span
              className={styles.track}
              role="progressbar"
              aria-label={`${row.name}: ${row.victoryPoints} of ${victoryPointGoal} VP`}
              aria-valuenow={row.progressPercent}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <span className={styles.fill} style={{ width: `${row.progressPercent}%` }} />
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}

/** Connected component for the game board: reads the match through its hook. */
export function PlayerStandings() {
  return <PlayerStandingsView {...usePlayerStandings()} />;
}
```

## `PlayerStandings.fixtures.ts`

```ts
import type { PlayerStandingsViewModel } from './PlayerStandings.types';

/** Shared by the tests and the testbed preview. Deterministic: no random values or dates. */
export const midGameStandings: PlayerStandingsViewModel = {
  victoryPointGoal: 30,
  rows: [
    { playerId: 2, name: 'Mira', color: 'purple', victoryPoints: 18, progressPercent: 60, rank: 1, isLocalPlayer: false },
    { playerId: 0, name: 'You', color: 'blue', victoryPoints: 12, progressPercent: 40, rank: 2, isLocalPlayer: true },
    { playerId: 1, name: 'Bot Rex', color: 'red', victoryPoints: 5, progressPercent: 17, rank: 3, isLocalPlayer: false },
  ],
};

export const tiedForFirstStandings: PlayerStandingsViewModel = {
  victoryPointGoal: 30,
  rows: [
    { playerId: 0, name: 'You', color: 'blue', victoryPoints: 21, progressPercent: 70, rank: 1, isLocalPlayer: true },
    { playerId: 3, name: 'Sol', color: 'yellow', victoryPoints: 21, progressPercent: 70, rank: 1, isLocalPlayer: false },
  ],
};
```

## `PlayerStandings.preview.tsx`

```tsx
import type { ComponentPreview } from '@/testbed';
import { PlayerStandingsView } from './PlayerStandings';
import { midGameStandings, tiedForFirstStandings } from './PlayerStandings.fixtures';

export const playerStandingsPreview: ComponentPreview = {
  slug: 'hud-player-standings',
  title: 'Player standings',
  group: 'HUD',
  states: [
    { name: 'Mid game', render: () => <PlayerStandingsView {...midGameStandings} /> },
    { name: 'Tied for first', render: () => <PlayerStandingsView {...tiedForFirstStandings} /> },
  ],
};
```

## `index.ts`

```ts
export { PlayerStandings, PlayerStandingsView } from './PlayerStandings';
export type { PlayerStandingsViewModel } from './PlayerStandings.types';
```

## `PlayerStandings.map.test.ts`

```ts
import type { Player } from '@/lib/types';
import { toPlayerStandings, toProgressPercent } from './PlayerStandings.map';

const createPlayer = (id: number, name: string, victoryPoints: number): Player =>
  ({ id, name, victoryPoints, color: 'blue' }) as Player;

describe('toProgressPercent', () => {
  it.each([
    [0, 30, 0],
    [15, 30, 50],
    [10, 30, 33],
    [45, 30, 100],
    [5, 0, 100],
  ])('%p VP of a %p goal is %p%%', (victoryPoints, goal, expected) => {
    expect(toProgressPercent(victoryPoints, goal)).toBe(expected);
  });
});

describe('toPlayerStandings', () => {
  const players = [createPlayer(0, 'Ada', 12), createPlayer(1, 'Bo', 20), createPlayer(2, 'Cy', 12)];

  it('orders players by victory points, highest first', () => {
    const { rows } = toPlayerStandings(players, 30, 0);

    expect(rows.map((row) => row.name)).toEqual(['Bo', 'Ada', 'Cy']);
  });

  it('gives tied players the same rank and skips the next one', () => {
    const { rows } = toPlayerStandings([...players, createPlayer(3, 'Di', 1)], 30, 0);

    expect(rows.map((row) => row.rank)).toEqual([1, 2, 2, 4]);
  });

  it('flags only the local player', () => {
    const { rows } = toPlayerStandings(players, 30, 2);

    expect(rows.filter((row) => row.isLocalPlayer).map((row) => row.name)).toEqual(['Cy']);
  });

  it('does not reorder the input array', () => {
    toPlayerStandings(players, 30, 0);

    expect(players.map((player) => player.name)).toEqual(['Ada', 'Bo', 'Cy']);
  });
});
```

## `PlayerStandings.hook.test.ts`

```ts
import { renderHook } from '@testing-library/react';
import { useGameBoard } from '@/features/game/context/GameBoardContext';
import type { Player } from '@/lib/types';
import { usePlayerStandings } from './PlayerStandings.hook';

jest.mock('@/features/game/context/GameBoardContext', () => ({ useGameBoard: jest.fn() }));

const createPlayer = (id: number, name: string, victoryPoints: number): Player =>
  ({ id, name, victoryPoints, color: 'red' }) as Player;

describe('usePlayerStandings', () => {
  it('builds the standings from the board context', () => {
    const players = [createPlayer(0, 'Ada', 6), createPlayer(1, 'Bo', 9)];
    jest.mocked(useGameBoard).mockReturnValue({
      gameState: { players, settings: { victoryPointGoal: 30 } },
      localPlayer: players[0],
    } as unknown as ReturnType<typeof useGameBoard>);

    const { result } = renderHook(() => usePlayerStandings());

    expect(result.current.victoryPointGoal).toBe(30);
    expect(result.current.rows.map((row) => [row.name, row.isLocalPlayer])).toEqual([
      ['Bo', false],
      ['Ada', true],
    ]);
  });
});
```

## `PlayerStandings.test.tsx`

```tsx
import { render, screen, within } from '@testing-library/react';
import { PlayerStandingsView } from './PlayerStandings';
import { midGameStandings } from './PlayerStandings.fixtures';

describe('PlayerStandingsView', () => {
  it('lists players in standings order with their points', () => {
    render(<PlayerStandingsView {...midGameStandings} />);

    const rows = within(screen.getByRole('list')).getAllByRole('listitem');
    expect(rows.map((row) => row.textContent)).toEqual(['1Mira18', '2You12', '3Bot Rex5']);
  });

  it('marks the local player as the current row', () => {
    render(<PlayerStandingsView {...midGameStandings} />);

    expect(screen.getByText('You').closest('li')).toHaveAttribute('aria-current', 'true');
    expect(screen.getByText('Mira').closest('li')).not.toHaveAttribute('aria-current');
  });

  it('exposes progress toward the goal to assistive technology', () => {
    render(<PlayerStandingsView {...midGameStandings} />);

    expect(screen.getByRole('progressbar', { name: 'Mira: 18 of 30 VP' })).toHaveAttribute(
      'aria-valuenow',
      '60',
    );
  });
});
```

## `src/modules/hud/index.ts`

```ts
export { PlayerStandings } from './components/PlayerStandings';
```
