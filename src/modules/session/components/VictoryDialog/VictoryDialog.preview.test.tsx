import { render, screen, fireEvent } from '@testing-library/react';
import { victoryDialogPreview } from './VictoryDialog.preview';

describe('VictoryDialog preview', () => {
  it('"You won" shows the local-winner title', () => {
    const state = victoryDialogPreview.states.find((s) => s.name === 'You won')!;
    render(state.render());

    expect(screen.getByRole('heading', { name: 'Victory!' })).toBeInTheDocument();
  });

  it('"Opponent won" shows the other-winner title', () => {
    const state = victoryDialogPreview.states.find((s) => s.name === 'Opponent won')!;
    render(state.render());

    expect(screen.getByRole('heading', { name: 'Game Over' })).toBeInTheDocument();
  });

  it('"Bot winner" shows the BOT badge', () => {
    const state = victoryDialogPreview.states.find((s) => s.name === 'Bot winner')!;
    render(state.render());

    expect(screen.getByText('BOT')).toBeInTheDocument();
  });

  it('"Returning" shows the disabled, spinning button', () => {
    const state = victoryDialogPreview.states.find((s) => s.name === 'Returning')!;
    render(state.render());

    expect(screen.getByRole('button', { name: 'Returning…' })).toBeDisabled();
  });

  it('closes via "Close preview" and reopens via "Reopen dialog"', () => {
    const state = victoryDialogPreview.states.find((s) => s.name === 'You won')!;
    render(state.render());

    // The AlertDialog's modal focus trap marks this button `aria-hidden` for assistive tech
    // (Radix's own behavior for an always-open AlertDialog), but it stays on-screen and
    // clickable by mouse, same as CombatDialog.preview.test.tsx.
    fireEvent.click(screen.getByRole('button', { name: 'Close preview', hidden: true }));

    expect(screen.queryByRole('heading', { name: 'Victory!' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reopen dialog' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Reopen dialog' }));

    expect(screen.getByRole('heading', { name: 'Victory!' })).toBeInTheDocument();
  });
});
