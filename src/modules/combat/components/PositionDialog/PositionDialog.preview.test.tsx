import { render, screen, fireEvent } from '@testing-library/react';
import { positionDialogPreview } from './PositionDialog.preview';

describe('PositionDialog preview', () => {
  it('renders the single resource state and closes via the Cancel button', () => {
    const singleResourceState = positionDialogPreview.states[0];
    render(singleResourceState.render());

    expect(screen.getByText(/Position Army Collector/)).toBeInTheDocument();
    expect(screen.getByText(/Gold/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(screen.queryByText(/Position Army Collector/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reopen dialog' })).toBeInTheDocument();
  });

  it('renders all three resources in the multiple resource types state', () => {
    const multipleState = positionDialogPreview.states[1];
    render(multipleState.render());

    expect(screen.getByText(/Food/)).toBeInTheDocument();
    expect(screen.getByText(/Wood/)).toBeInTheDocument();
    expect(screen.getByText(/Gold/)).toBeInTheDocument();
  });
});
