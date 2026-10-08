import { fireEvent, render, screen, within } from '@testing-library/react';
import { GameLogView } from './GameLog';
import {
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
});
