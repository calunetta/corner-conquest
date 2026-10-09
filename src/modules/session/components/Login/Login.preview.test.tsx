import { render, screen } from '@testing-library/react';
import { loginPreview } from './Login.preview';

function renderState(stateName: string) {
  const state = loginPreview.states.find((candidate) => candidate.name === stateName);
  if (!state) {
    throw new Error(`Login preview has no "${stateName}" state`);
  }
  return render(state.render());
}

describe('Login preview', () => {
  it('Guest state shows the Google sign-in button', () => {
    renderState('Guest');

    expect(screen.getByRole('button', { name: 'Sign in with Google' })).toBeInTheDocument();
  });

  it('Account state does not show the Google sign-in button', () => {
    renderState('Account');

    expect(screen.queryByRole('button', { name: 'Sign in with Google' })).not.toBeInTheDocument();
  });

  it('Loading state shows the loading status and no name input', () => {
    renderState('Loading');

    expect(screen.getByRole('status', { name: 'Loading' })).toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: /commander name/i })).not.toBeInTheDocument();
  });
});
