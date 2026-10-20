import { fireEvent, render, screen, within } from '@testing-library/react';
import { CardName } from '@/lib/types';
import type { Player, StructuredLogEntry } from '@/lib/types';
import { GameLogView } from './GameLog';
import { toLogEntryViewModels, toMessageSegments } from './GameLog.map';
import {
  cardUseLog,
  declutterOffLog,
  declutterOnLog,
  emptyLog,
  legacyOnlyLog,
  mixedTwoTurnsLog,
  preGameLog,
  withMilestoneLog,
} from './GameLog.fixtures';
import type { GameLogViewModel } from './GameLog.types';

describe('GameLogView', () => {
  it('renders nothing in the scroll area when entries is empty', () => {
    render(<GameLogView {...emptyLog} />);
    const scrollArea = screen.getByTestId('game-log-scroll');
    expect(within(scrollArea).queryAllByRole('paragraph')).toHaveLength(0);
    expect(screen.getByText('Event Log')).toBeInTheDocument();
  });

  describe('legacy-only entries (acceptance criterion 1)', () => {
    it('renders every entry as plain text with no icon and no turn divider', () => {
      const { container } = render(<GameLogView {...legacyOnlyLog} />);
      const scrollArea = screen.getByTestId('game-log-scroll');
      const entries = within(scrollArea).getAllByRole('paragraph');

      expect(entries).toHaveLength(3);
      // newest-first: the fixture's last input string renders first
      expect(entries[0]).toHaveTextContent('Player Red gained 5 Food from harvesting');
      expect(container.querySelectorAll('svg')).toHaveLength(0);
      expect(screen.queryAllByRole('separator')).toHaveLength(0);
    });

    it('renders the message text with no color-class span (no player-color accent)', () => {
      render(<GameLogView {...legacyOnlyLog} />);
      const scrollArea = screen.getByTestId('game-log-scroll');
      const entries = within(scrollArea).getAllByRole('paragraph');

      entries.forEach((entry) => {
        const spans = entry.querySelectorAll('span');
        spans.forEach((span) => {
          expect(span).not.toHaveAttribute('style');
          // a legacy entry's single text segment has colorClass: null -> no class attribute at all
          // (entryText wrapper's 'flex-1' is the only expected class anywhere in a legacy entry)
          if (span.className !== 'flex-1') {
            expect(span.className).toBe('');
          }
        });
      });
    });
  });

  it('renders a "Turn N" divider for each of two distinct turn values, in document order (criterion 2)', () => {
    render(<GameLogView {...mixedTwoTurnsLog} />);
    const dividers = screen.getAllByRole('separator');

    // newest-first: turn 2 entry comes before the turn 1 entries, so its divider appears first
    expect(dividers).toHaveLength(2);
    expect(dividers[0]).toHaveTextContent('Turn 2');
    expect(dividers[1]).toHaveTextContent('Turn 1');
  });

  it('colors the acting player and target player name substrings differently within one line (criterion 3)', () => {
    render(<GameLogView {...mixedTwoTurnsLog} />);
    const scrollArea = screen.getByTestId('game-log-scroll');
    const line = within(scrollArea).getByText((_, element) => element?.tagName === 'P' && !!element.textContent?.includes('defeated'));

    const adaSpan = within(line).getByText('Ada');
    const boSpan = within(line).getByText('Bo');

    expect(adaSpan.className).not.toBe('');
    expect(boSpan.className).not.toBe('');
    expect(adaSpan.className).not.toBe(boSpan.className);
  });

  describe('declutter toggle (criteria 4-5)', () => {
    it('hides isPassive entries while the toggle is off, keeping isMilestone entries visible regardless', () => {
      render(<GameLogView {...withMilestoneLog} />);
      const scrollArea = screen.getByTestId('game-log-scroll');

      expect(within(scrollArea).queryByText('Ada collected resources')).not.toBeInTheDocument();
      const entries = within(scrollArea).getAllByRole('paragraph');
      expect(entries).toHaveLength(1);
      expect(entries[0]).toHaveTextContent('Ada won the game!');
    });

    it('toggle off: shows only the non-passive entry', () => {
      render(<GameLogView {...declutterOffLog} />);
      const scrollArea = screen.getByTestId('game-log-scroll');
      const entries = within(scrollArea).getAllByRole('paragraph');

      expect(entries).toHaveLength(1);
      expect(entries[0]).toHaveTextContent('Bo bought a card');
    });

    it('toggle on: reveals the passive entry without removing or reordering the already-visible one', () => {
      render(<GameLogView {...declutterOnLog} />);
      const scrollArea = screen.getByTestId('game-log-scroll');
      const entries = within(scrollArea).getAllByRole('paragraph');

      expect(entries).toHaveLength(2);
      // same relative order as toggle-off: the non-passive entry ("Bo bought a card") stays first
      expect(entries[0]).toHaveTextContent('Bo bought a card');
      expect(entries[1]).toHaveTextContent('Ada collected resources');
    });

    it('clicking the Switch invokes onToggleShowRoutineActivity', () => {
      const onToggle = jest.fn();
      const viewModel: GameLogViewModel = { ...declutterOffLog, onToggleShowRoutineActivity: onToggle };
      render(<GameLogView {...viewModel} />);

      fireEvent.click(screen.getByRole('switch'));
      expect(onToggle).toHaveBeenCalledTimes(1);
    });
  });

  it('renders zero turn dividers for an all-turn-0 (pre-game) log', () => {
    render(<GameLogView {...preGameLog} />);
    expect(screen.queryAllByRole('separator')).toHaveLength(0);
  });

  describe('declutter Switch accessibility', () => {
    it('has a visible text label', () => {
      render(<GameLogView {...declutterOffLog} />);
      expect(screen.getByText('Show routine activity')).toBeInTheDocument();
    });

    it('is a native, keyboard-focusable control', () => {
      render(<GameLogView {...declutterOffLog} />);
      const toggle = screen.getByRole('switch');

      expect(toggle.tagName).toBe('BUTTON');
      expect(toggle).not.toBeDisabled();
      toggle.focus();
      expect(toggle).toHaveFocus();
    });

    it('exposes aria-checked matching showRoutineActivity, false by default and true when on', () => {
      render(<GameLogView {...declutterOffLog} />);
      expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'false');
    });

    it('exposes aria-checked="true" when showRoutineActivity is true', () => {
      render(<GameLogView {...declutterOnLog} />);
      expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'true');
    });
  });

  describe('variant', () => {
    /** Visible entry texts in newest-first order, read from the scroll area. */
    function entryTexts(): string[] {
      const scrollArea = screen.getByTestId('game-log-scroll');
      return within(scrollArea)
        .getAllByRole('paragraph')
        .map((entry) => entry.textContent ?? '');
    }

    it('panel and sheet variants show the same title, switch label, dividers and entries', () => {
      const { unmount } = render(<GameLogView {...mixedTwoTurnsLog} variant="panel" />);
      const panelEntries = entryTexts();
      const panelDividers = screen.getAllByRole('separator').map((divider) => divider.textContent);
      unmount();

      render(<GameLogView {...mixedTwoTurnsLog} variant="sheet" />);

      expect(screen.getByText('Event Log')).toBeInTheDocument();
      expect(screen.getByRole('switch', { name: 'Show routine activity' })).toBeInTheDocument();
      expect(entryTexts()).toEqual(panelEntries);
      expect(screen.getAllByRole('separator').map((divider) => divider.textContent)).toEqual(panelDividers);
    });

    it('omitting variant renders the same entries as variant="panel"', () => {
      const { unmount } = render(<GameLogView {...legacyOnlyLog} variant="panel" />);
      const panelEntries = entryTexts();
      unmount();

      render(<GameLogView {...legacyOnlyLog} />);

      expect(entryTexts()).toEqual(panelEntries);
      expect(entryTexts()).toHaveLength(3);
    });

    it('the switch still calls onToggleShowRoutineActivity in the sheet variant', () => {
      const onToggle = jest.fn();
      render(<GameLogView {...declutterOffLog} onToggleShowRoutineActivity={onToggle} variant="sheet" />);

      fireEvent.click(screen.getByRole('switch'));

      expect(onToggle).toHaveBeenCalledTimes(1);
    });
  });
  describe('card icons', () => {
    it('shows the card icon on each card-use entry, matched by file name, and none on the bought-card entry', () => {
      render(<GameLogView {...cardUseLog} />);
      const entries = within(screen.getByTestId('game-log-scroll')).getAllByRole('paragraph');

      // newest-first: bought card, Reinforce, War Chief
      expect(entries).toHaveLength(3);
      expect(within(entries[0]).queryByTestId('log-card-icon')).not.toBeInTheDocument();
      expect(within(entries[0]).getByTestId('registry-icon-layers')).toBeInTheDocument();
      expect(within(entries[1]).getByTestId('log-card-icon').getAttribute('src')).toContain('reinforce');
      expect(within(entries[2]).getByTestId('log-card-icon').getAttribute('src')).toContain('war-chief-icon');
      expect(within(entries[2]).queryByTestId('registry-icon-swords')).not.toBeInTheDocument();
    });

    it('marks the card icon decorative (empty alt)', () => {
      render(<GameLogView {...cardUseLog} />);

      screen.getAllByTestId('log-card-icon').forEach((icon) => expect(icon).toHaveAttribute('alt', ''));
    });

    it('renders the redacted message with no card icon and no card name when the viewer cannot read the entry', () => {
      const players = [{ playerId: 'p-blue', name: 'Ada', color: 'blue' }] as Player[];
      const entry: StructuredLogEntry = {
        kind: 'structured',
        turn: 1,
        category: 'cards',
        message: "Ada used 'Sabotage'.",
        redactedMessage: 'Ada used a card.',
        visibility: { scope: 'owner' },
        playerId: 'p-blue',
        cardName: CardName.Sabotage,
      };
      const entries = toLogEntryViewModels([entry], players, () => false).map((vm) => ({
        ...vm,
        segments: toMessageSegments(vm),
        turnDividerLabel: null,
      }));

      render(<GameLogView entries={entries} showRoutineActivity={false} onToggleShowRoutineActivity={() => {}} />);

      const [paragraph] = within(screen.getByTestId('game-log-scroll')).getAllByRole('paragraph');
      expect(paragraph).toHaveTextContent('Ada used a card.');
      expect(paragraph).not.toHaveTextContent('Sabotage');
      expect(screen.queryByTestId('log-card-icon')).not.toBeInTheDocument();
      expect(within(paragraph).getByTestId('registry-icon-layers')).toBeInTheDocument();
    });

    it('shows no card icon for legacy string entries', () => {
      render(<GameLogView {...legacyOnlyLog} />);

      expect(screen.queryByTestId('log-card-icon')).not.toBeInTheDocument();
    });
  });
});
