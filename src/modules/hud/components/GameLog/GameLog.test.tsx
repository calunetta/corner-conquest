import { render, screen, within } from '@testing-library/react';
import type { StructuredLogEntry } from '@/lib/types';
import { GameLogView } from './GameLog';
import type { GameLogViewModel } from './GameLog.types';

describe('GameLogView', () => {
  it('renders no paragraphs when entries array is empty', () => {
    const viewModel: GameLogViewModel = { entries: [] };
    render(<GameLogView {...viewModel} />);

    const scrollArea = screen.getByTestId('game-log-scroll');
    const entries = within(scrollArea).queryAllByRole('paragraph');
    expect(entries).toHaveLength(0);
  });

  it('renders entries in order (newest first)', () => {
    const viewModel: GameLogViewModel = {
      entries: [
        'Player Red attacked Player Blue',
        'Player Blue upgraded to 2 attack power',
        'Player Green deployed a new army',
      ],
    };
    render(<GameLogView {...viewModel} />);

    // Get all entries - they're rendered as paragraphs inside the scroll area
    const scrollArea = screen.getByTestId('game-log-scroll');
    const entries = within(scrollArea).getAllByRole('paragraph');

    // Should be in the order provided (already reversed by the hook/map)
    expect(entries[0]).toHaveTextContent('Player Red attacked Player Blue');
    expect(entries[1]).toHaveTextContent('Player Blue upgraded to 2 attack power');
    expect(entries[2]).toHaveTextContent('Player Green deployed a new army');
  });

  it('renders each entry as a paragraph element', () => {
    const viewModel: GameLogViewModel = {
      entries: ['Event 1', 'Event 2', 'Event 3'],
    };
    render(<GameLogView {...viewModel} />);

    const scrollArea = screen.getByTestId('game-log-scroll');
    const entries = within(scrollArea).getAllByRole('paragraph');
    expect(entries).toHaveLength(3);
  });

  it('renders the card header with title', () => {
    const viewModel: GameLogViewModel = { entries: [] };
    render(<GameLogView {...viewModel} />);

    expect(screen.getByText('Event Log')).toBeInTheDocument();
  });

  it('renders scroll area wrapper with test id', () => {
    const viewModel: GameLogViewModel = { entries: ['Test entry'] };
    render(<GameLogView {...viewModel} />);

    const scrollArea = screen.getByTestId('game-log-scroll');
    expect(scrollArea).toBeInTheDocument();
  });

  it('handles single entry', () => {
    const viewModel: GameLogViewModel = { entries: ['Only entry'] };
    render(<GameLogView {...viewModel} />);

    const scrollArea = screen.getByTestId('game-log-scroll');
    const entries = within(scrollArea).getAllByRole('paragraph');
    expect(entries).toHaveLength(1);
    expect(entries[0]).toHaveTextContent('Only entry');
  });

  it('handles entries with special characters and punctuation', () => {
    const viewModel: GameLogViewModel = {
      entries: [
        'Player "Blue" defeated [Monster Level 2]!',
        'Island gained +5 Gold (Resource bonus)',
      ],
    };
    render(<GameLogView {...viewModel} />);

    const scrollArea = screen.getByTestId('game-log-scroll');
    const entries = within(scrollArea).getAllByRole('paragraph');
    expect(entries[0]).toHaveTextContent('Player "Blue" defeated [Monster Level 2]!');
    expect(entries[1]).toHaveTextContent('Island gained +5 Gold (Resource bonus)');
  });

  it('renders a structured entry by its message text, not [object Object]', () => {
    const structured: StructuredLogEntry = {
      kind: 'structured',
      turn: 3,
      category: 'cards',
      message: 'Player Blue bought a card',
      playerId: 'p1',
    };
    const viewModel: GameLogViewModel = { entries: [structured] };
    render(<GameLogView {...viewModel} />);

    const scrollArea = screen.getByTestId('game-log-scroll');
    const entries = within(scrollArea).getAllByRole('paragraph');
    expect(entries).toHaveLength(1);
    expect(entries[0]).toHaveTextContent('Player Blue bought a card');
    expect(entries[0]).not.toHaveTextContent('[object Object]');
  });

  it('renders a mix of legacy string and structured entries, each shown as plain text', () => {
    const structured: StructuredLogEntry = {
      kind: 'structured',
      turn: 1,
      category: 'system',
      message: 'Player Red has joined the game.',
    };
    const viewModel: GameLogViewModel = {
      entries: [structured, 'Legacy entry, unchanged'],
    };
    render(<GameLogView {...viewModel} />);

    const scrollArea = screen.getByTestId('game-log-scroll');
    const entries = within(scrollArea).getAllByRole('paragraph');
    expect(entries).toHaveLength(2);
    expect(entries[0]).toHaveTextContent('Player Red has joined the game.');
    expect(entries[1]).toHaveTextContent('Legacy entry, unchanged');
  });
});
