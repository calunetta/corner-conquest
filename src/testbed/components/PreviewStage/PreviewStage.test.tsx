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
  it('renders a closed list of state links when no stateName is provided', () => {
    render(<PreviewStage slug="sample-badge" />);

    expect(screen.getByRole('heading', { level: 1, name: 'Sample badge' })).toBeInTheDocument();

    // State content should NOT appear
    expect(screen.queryByText('default badge')).not.toBeInTheDocument();
    expect(screen.queryByText('expiring badge')).not.toBeInTheDocument();

    // State links should appear
    const stateLinks = screen.getByTestId('testbed-state-list');
    expect(stateLinks).toBeInTheDocument();

    const defaultLink = screen.getByRole('link', { name: 'Default' });
    expect(defaultLink).toHaveAttribute('href', '/testbed/sample-badge?state=Default');

    const expiringLink = screen.getByRole('link', { name: 'Expiring' });
    expect(expiringLink).toHaveAttribute('href', '/testbed/sample-badge?state=Expiring');
  });

  it('renders only the requested state', () => {
    render(<PreviewStage slug="sample-badge" stateName="Expiring" />);

    expect(screen.getByText('expiring badge')).toBeInTheDocument();
    expect(screen.queryByText('default badge')).not.toBeInTheDocument();
  });

  it('renders a state link with a simple name (no special-casing needed)', () => {
    render(<PreviewStage slug="sample-badge" />);

    const stateList = screen.getByTestId('testbed-state-list');
    const links = stateList.querySelectorAll('a');

    expect(links).toHaveLength(2);
    expect(links[0]).toHaveTextContent('Default');
    expect(links[0]).toHaveAttribute('href', '/testbed/sample-badge?state=Default');
  });

  it('lists the available states when the requested one does not exist', () => {
    render(<PreviewStage slug="sample-badge" stateName="Missing" />);

    const message = screen.getByTestId('testbed-missing');
    expect(message).toHaveTextContent('No state named "Missing". Available: Default, Expiring.');
  });

  it('explains when no preview matches the slug', () => {
    render(<PreviewStage slug="unknown" />);

    expect(screen.getByRole('heading', { level: 1, name: 'Preview not found' })).toBeInTheDocument();
    const message = screen.getByTestId('testbed-missing');
    expect(message).toHaveTextContent('No preview is registered with the slug "unknown"');
  });
});
