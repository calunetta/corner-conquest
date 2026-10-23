import { useRef, useState } from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { useGameBoard } from '@/features/game/context/GameBoardContext';
import type { GameState, LogEntry, Player } from '@/lib/types';
import { MobileEventLogSheet } from './MobileEventLogSheet';

jest.mock('@/features/game/context/GameBoardContext', () => ({ useGameBoard: jest.fn() }));

const bluePlayer = { playerId: 'p-blue', name: 'Ada', color: 'blue' } as Player;
const redPlayer = { playerId: 'p-red', name: 'Bo', color: 'red' } as Player;

const log: LogEntry[] = [
  {
    kind: 'structured',
    turn: 1,
    category: 'economy',
    message: 'Ada gained 5 Gold from harvesting',
    playerId: 'p-blue',
  },
  {
    kind: 'structured',
    turn: 2,
    category: 'cards',
    message: 'Bo bought a card',
    playerId: 'p-red',
  },
];

function mockGameLog(entries: LogEntry[]) {
  const gameState = { log: entries, players: [bluePlayer, redPlayer] } as unknown as GameState;
  jest.mocked(useGameBoard).mockReturnValue({ gameState } as unknown as ReturnType<typeof useGameBoard>);
}

/** Opens the sheet the way the player does: a real trigger button that is not focused by the click. */
function SheetHarness() {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  return (
    <>
      <button ref={triggerRef} type="button" onClick={() => setIsOpen(true)}>
        Open log
      </button>
      <MobileEventLogSheet open={isOpen} onOpenChange={setIsOpen} triggerRef={triggerRef} />
    </>
  );
}

describe('MobileEventLogSheet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGameLog(log);
  });

  describe('when open', () => {
    it('renders a dialog named "Event Log" with the log title and the routine-activity switch', () => {
      render(<MobileEventLogSheet open onOpenChange={jest.fn()} />);

      const dialog = screen.getByRole('dialog', { name: 'Event Log' });
      // The sheet title is the h2 Ribbon (its sr-only class sits on the frame); GameLogView's visible header is the h3.
      expect(within(dialog).getByRole('heading', { level: 2, name: 'Event Log' })).toBeInTheDocument();
      expect(within(dialog).getByRole('heading', { level: 3, name: 'Event Log' })).toBeInTheDocument();
      expect(within(dialog).getByRole('switch', { name: 'Show routine activity' })).toBeInTheDocument();
    });

    it('lists the log entries from useGameLog, newest first', () => {
      render(<MobileEventLogSheet open onOpenChange={jest.fn()} />);

      const entries = within(screen.getByRole('dialog', { name: 'Event Log' })).getAllByRole('paragraph');
      // Routine activity is hidden by default, so only the non-passive "cards" entry from turn 2 shows.
      expect(entries).toHaveLength(2);
      expect(entries[0]).toHaveTextContent('Bo bought a card');
      expect(entries[1]).toHaveTextContent('Ada gained 5 Gold from harvesting');
    });

    it('shows a turn divider for each turn in the log', () => {
      render(<MobileEventLogSheet open onOpenChange={jest.fn()} />);

      const dividers = screen.getAllByRole('separator');
      expect(dividers).toHaveLength(2);
      expect(dividers[0]).toHaveTextContent('Turn 2');
      expect(dividers[1]).toHaveTextContent('Turn 1');
    });

    it('calls onOpenChange(false) when Escape is pressed', () => {
      const onOpenChange = jest.fn();
      render(<MobileEventLogSheet open onOpenChange={onOpenChange} />);

      fireEvent.keyDown(screen.getByRole('dialog', { name: 'Event Log' }), { key: 'Escape' });

      expect(onOpenChange).toHaveBeenCalledWith(false);
    });

    it('calls onOpenChange(false) when the close button is clicked', () => {
      const onOpenChange = jest.fn();
      render(<MobileEventLogSheet open onOpenChange={onOpenChange} />);

      fireEvent.click(screen.getByRole('button', { name: 'Close' }));

      expect(onOpenChange).toHaveBeenCalledWith(false);
    });

    it('does not call onOpenChange when the routine-activity switch is toggled (the hook owns that state)', () => {
      const onOpenChange = jest.fn();
      render(<MobileEventLogSheet open onOpenChange={onOpenChange} />);

      fireEvent.click(screen.getByRole('switch', { name: 'Show routine activity' }));

      expect(onOpenChange).not.toHaveBeenCalled();
    });
  });

  describe('when closed', () => {
    it('renders no dialog', () => {
      render(<MobileEventLogSheet open={false} onOpenChange={jest.fn()} />);

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(screen.queryByText('Event Log')).not.toBeInTheDocument();
    });
  });

  describe('focus restore', () => {
    it('returns focus to the trigger after the player closes the sheet', async () => {
      render(<SheetHarness />);
      const trigger = screen.getByRole('button', { name: 'Open log' });

      fireEvent.click(trigger);
      fireEvent.click(screen.getByRole('button', { name: 'Close' }));

      await waitFor(() => expect(trigger).toHaveFocus());
    });

    it('returns focus to the trigger after Escape closes the sheet', async () => {
      render(<SheetHarness />);
      const trigger = screen.getByRole('button', { name: 'Open log' });

      fireEvent.click(trigger);
      fireEvent.keyDown(screen.getByRole('dialog', { name: 'Event Log' }), { key: 'Escape' });

      await waitFor(() => expect(trigger).toHaveFocus());
    });
  });
});
