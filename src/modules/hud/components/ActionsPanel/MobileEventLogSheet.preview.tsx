import { useState, type ReactNode } from 'react';
import type { ComponentPreview } from '@/testbed';
import { GameBoardProvider } from '@/modules/game-board';
import { PlayerColor, type GameState, type LogEntry, type Player } from '@/lib/types';
import { MobileEventLogSheet } from './MobileEventLogSheet';

const localPlayer = { playerId: 'p-blue', name: 'Ada', color: PlayerColor.Blue } as Player;
const opponent = { playerId: 'p-red', name: 'Bo', color: PlayerColor.Red } as Player;

const sampleLog: LogEntry[] = [
  'Pre-game: Ada joined the match',
  { kind: 'structured', turn: 1, category: 'economy', message: 'Ada collected resources', playerId: 'p-blue', isPassive: true },
  { kind: 'structured', turn: 1, category: 'combat', message: 'Ada defeated Bo in battle!', playerId: 'p-blue', targetPlayerId: 'p-red' },
  { kind: 'structured', turn: 2, category: 'economy', message: 'Bo gained 5 Gold from harvesting', playerId: 'p-red' },
];

function buildBoardState(log: LogEntry[]): GameState {
  return {
    id: 'preview_event_log',
    name: 'Preview',
    status: 'playing',
    players: [localPlayer, opponent],
    map: [],
    baseTiles: [],
    currentPlayerIndex: 0,
    turn: 2,
    log,
  } as unknown as GameState;
}

// Module-level constants: GameBoardProvider re-syncs when serverGameState identity changes.
export const sampleEventLogGameState = buildBoardState(sampleLog);
export const emptyEventLogGameState = buildBoardState([]);

/** Supplies the board context the Event Log reads. Only the log is used; the rest is inert. */
export function WithEventLogBoard({ gameState, children }: { gameState: GameState; children: ReactNode }) {
  return (
    <GameBoardProvider
      gameId="preview_event_log"
      playerId={localPlayer.playerId}
      serverGameState={gameState}
      localPlayerFromServer={localPlayer}
      isMyTurn={false}
      isHost={true}
      setGameState={async () => {}}
      onExit={() => {}}
    >
      {children}
    </GameBoardProvider>
  );
}

/** Starts open so the sheet is visible on load; closing it reveals a Reopen trigger. */
function InteractiveEventLogSheet({ gameState }: { gameState: GameState }) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <WithEventLogBoard gameState={gameState}>
      {!isOpen && (
        <div className="p-4">
          <button
            type="button"
            className="rounded-md border border-white/20 px-3 py-1.5 text-sm text-white"
            onClick={() => setIsOpen(true)}
          >
            Reopen event log
          </button>
        </div>
      )}
      <MobileEventLogSheet open={isOpen} onOpenChange={setIsOpen} />
    </WithEventLogBoard>
  );
}

export const mobileEventLogSheetPreview: ComponentPreview = {
  slug: 'hud-mobile-event-log-sheet',
  title: 'Mobile event log sheet',
  group: 'HUD',
  states: [
    {
      name: 'Open, two turns of entries',
      render: () => <InteractiveEventLogSheet gameState={sampleEventLogGameState} />,
    },
    {
      name: 'Open, empty log',
      render: () => <InteractiveEventLogSheet gameState={emptyEventLogGameState} />,
    },
  ],
};
