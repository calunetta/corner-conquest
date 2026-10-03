import { render, screen, fireEvent } from '@testing-library/react';
import { combatDialogPreview } from './CombatDialog.preview';

describe('CombatDialog preview - stuck modal bug reproduction', () => {
  it('the rolling phase (no in-dialog close control) still closes via "Close preview"', () => {
    const rollingState = combatDialogPreview.states[0];
    render(rollingState.render());

    expect(screen.getByText('Territory Battle!')).toBeInTheDocument();

    // The AlertDialog's modal focus trap marks this button `aria-hidden` for assistive tech
    // (Radix's own behavior for an always-open AlertDialog), but it stays on-screen and
    // clickable by mouse at a higher z-index than the dialog overlay — `hidden: true` matches
    // how a sighted testbed user actually reaches it.
    fireEvent.click(screen.getByRole('button', { name: 'Close preview', hidden: true }));

    expect(screen.queryByText('Territory Battle!')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reopen dialog' })).toBeInTheDocument();
  });

  it('the spectator rolling state (no actionable control at all) still closes via "Close preview"', () => {
    const spectatorState = combatDialogPreview.states[2];
    render(spectatorState.render());

    expect(screen.getByText('Territory Battle!')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Roll for Battle!' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Close preview', hidden: true }));

    expect(screen.queryByText('Territory Battle!')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reopen dialog' })).toBeInTheDocument();
  });

  it('the results phase closes via its own "Confirm Results" button', () => {
    const resultsState = combatDialogPreview.states[3];
    render(resultsState.render());

    expect(screen.getByText('Combat Outcome')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Confirm Results' }));

    expect(screen.queryByText('Combat Outcome')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reopen dialog' })).toBeInTheDocument();
  });
});
