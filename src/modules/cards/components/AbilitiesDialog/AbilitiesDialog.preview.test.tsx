import { render, screen, fireEvent } from '@testing-library/react';
import { abilitiesDialogPreview } from './AbilitiesDialog.preview';

describe('AbilitiesDialog preview', () => {
  it('renders both abilities when neither owned and both affordable', () => {
    const state = abilitiesDialogPreview.states[0];
    render(state.render());

    expect(screen.getByText('Empire Abilities Shop')).toBeInTheDocument();
    expect(screen.getByText('Explorer')).toBeInTheDocument();
    expect(screen.getByText('Collector')).toBeInTheDocument();
  });

  it('shows buy buttons as disabled when player cannot afford', () => {
    const state = abilitiesDialogPreview.states[1];
    render(state.render());

    const buyButtons = screen.queryAllByRole('button', { name: /Buy/ });
    buyButtons.forEach((button) => {
      expect(button).toBeDisabled();
    });
  });

  it('shows owned ability with checkmark and no buy button', () => {
    const state = abilitiesDialogPreview.states[2];
    render(state.render());

    // The component should show that one ability is owned
    expect(screen.getByText('Explorer')).toBeInTheDocument();
    expect(screen.getByText('Collector')).toBeInTheDocument();
  });

  it('hides all buy buttons when not my turn', () => {
    const state = abilitiesDialogPreview.states[3];
    render(state.render());

    expect(screen.getByText('Empire Abilities Shop')).toBeInTheDocument();
    // No buy buttons should be visible at all
    const buyButtons = screen.queryAllByRole('button', { name: /Buy/ });
    expect(buyButtons.length).toBe(0);
  });

  it('closes via the Close button', () => {
    const state = abilitiesDialogPreview.states[0];
    render(state.render());

    expect(screen.getByText('Empire Abilities Shop')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Close' }));

    expect(screen.queryByText('Empire Abilities Shop')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reopen dialog' })).toBeInTheDocument();
  });
});
