import { render, screen } from '@testing-library/react';
import { PreviewStage } from './PreviewStage';

jest.mock('../../registry', () => ({
  findPreview: (slug: string) =>
    slug === 'sample-badge'
      ? {
          slug,
          title: 'Sample badge',
          group: 'HUD',
          states: [
            { name: 'Default', render: () => <span>default badge</span> },
            { name: 'Expiring', render: () => <span>expiring badge</span> },
          ],
        }
      : undefined,
}));

describe('PreviewStage', () => {
  it('renders every state of the preview in its own labelled section', () => {
    render(<PreviewStage slug="sample-badge" />);

    expect(screen.getByRole('heading', { level: 1, name: 'Sample badge' })).toBeInTheDocument();
    expect(screen.getByTestId('testbed-state-default')).toHaveTextContent('default badge');
    expect(screen.getByTestId('testbed-state-expiring')).toHaveTextContent('expiring badge');
  });

  it('renders only the requested state', () => {
    render(<PreviewStage slug="sample-badge" stateName="Expiring" />);

    expect(screen.getByText('expiring badge')).toBeInTheDocument();
    expect(screen.queryByText('default badge')).not.toBeInTheDocument();
  });

  it('lists the available states when the requested one does not exist', () => {
    render(<PreviewStage slug="sample-badge" stateName="Missing" />);

    expect(screen.getByText(/No state named “Missing”. Available: Default, Expiring./)).toBeInTheDocument();
  });

  it('explains when no preview matches the slug', () => {
    render(<PreviewStage slug="unknown" />);

    expect(screen.getByRole('heading', { level: 1, name: 'Preview not found' })).toBeInTheDocument();
    expect(screen.getByText(/No preview is registered with the slug “unknown”/)).toBeInTheDocument();
  });
});
