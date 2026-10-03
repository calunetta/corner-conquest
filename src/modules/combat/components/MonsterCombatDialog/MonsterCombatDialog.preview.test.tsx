import { render, screen, fireEvent } from '@testing-library/react';
import { monsterCombatDialogPreview } from './MonsterCombatDialog.preview';

describe('MonsterCombatDialog preview - stuck modal bug reproduction', () => {
  it('the attack screen closes via its own Cancel button', () => {
    const attackState = monsterCombatDialogPreview.states[0];
    render(attackState.render());

    expect(screen.getByRole('button', { name: 'Attack Monster!' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(screen.queryByRole('button', { name: 'Attack Monster!' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reopen dialog' })).toBeInTheDocument();
  });

  it('the results screen closes via its own Continue button', () => {
    const resultsState = monsterCombatDialogPreview.states[2];
    render(resultsState.render());

    expect(screen.getByText('Battle Outcome')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

    expect(screen.queryByText('Battle Outcome')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reopen dialog' })).toBeInTheDocument();
  });

  it('the spectator screen (no in-dialog close control) still closes via "Close preview"', () => {
    const spectatorState = monsterCombatDialogPreview.states[4];
    render(spectatorState.render());

    expect(screen.getByText('Waiting for combat resolution...')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Cancel' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Continue' })).not.toBeInTheDocument();

    // See CombatDialog.preview.test.tsx: `hidden: true` matches the on-screen, mouse-clickable
    // fallback button that Radix's AlertDialog focus trap marks aria-hidden for assistive tech.
    fireEvent.click(screen.getByRole('button', { name: 'Close preview', hidden: true }));

    expect(screen.queryByText('Waiting for combat resolution...')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reopen dialog' })).toBeInTheDocument();
  });
});
