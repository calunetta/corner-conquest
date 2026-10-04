import { render, screen, within } from '@testing-library/react';
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
  describe('No state selected', () => {
    it('shows switcher nav with all state links, placeholder message, and no state content', () => {
      render(<PreviewStage slug="sample-badge" />);

      // Verify switcher nav is present with all state links
      const stateNav = screen.getByTestId('testbed-state-list');
      expect(stateNav).toBeInTheDocument();

      const defaultLink = screen.getByRole('link', { name: 'Default' });
      expect(defaultLink).toHaveAttribute('href', '/testbed/sample-badge?state=Default');
      expect(defaultLink).not.toHaveAttribute('aria-current');

      const expiringLink = screen.getByRole('link', { name: 'Expiring' });
      expect(expiringLink).toHaveAttribute('href', '/testbed/sample-badge?state=Expiring');
      expect(expiringLink).not.toHaveAttribute('aria-current');

      // Verify placeholder is shown
      const placeholder = screen.getByTestId('testbed-no-selection');
      expect(placeholder).toHaveTextContent('Select a state above to preview it.');

      // Verify no state content is rendered
      expect(screen.queryByText('default badge')).not.toBeInTheDocument();
      expect(screen.queryByText('expiring badge')).not.toBeInTheDocument();
    });
  });

  describe('Valid state selected', () => {
    it('shows switcher nav with active link, selected state content, and no placeholder', () => {
      render(<PreviewStage slug="sample-badge" stateName="Default" />);

      // Verify switcher nav is still present (key fix: was previously hidden)
      const stateNav = screen.getByTestId('testbed-state-list');
      expect(stateNav).toBeInTheDocument();

      // Verify all state links are present
      const defaultLink = screen.getByRole('link', { name: 'Default' });
      expect(defaultLink).toBeInTheDocument();
      const expiringLink = screen.getByRole('link', { name: 'Expiring' });
      expect(expiringLink).toBeInTheDocument();

      // Verify only the selected link has aria-current
      expect(defaultLink).toHaveAttribute('aria-current', 'page');
      expect(expiringLink).not.toHaveAttribute('aria-current');

      // Verify selected state's content is rendered
      expect(screen.getByText('default badge')).toBeInTheDocument();

      // Verify other state's content is NOT rendered
      expect(screen.queryByText('expiring badge')).not.toBeInTheDocument();

      // Verify placeholder is NOT shown
      expect(screen.queryByTestId('testbed-no-selection')).not.toBeInTheDocument();
    });

    it('switches content when a different state is selected', () => {
      render(<PreviewStage slug="sample-badge" stateName="Expiring" />);

      // Verify Expiring content is shown
      expect(screen.getByText('expiring badge')).toBeInTheDocument();
      expect(screen.queryByText('default badge')).not.toBeInTheDocument();

      // Verify Expiring link is active
      const expiringLink = screen.getByRole('link', { name: 'Expiring' });
      expect(expiringLink).toHaveAttribute('aria-current', 'page');

      // Verify Default link is not active
      const defaultLink = screen.getByRole('link', { name: 'Default' });
      expect(defaultLink).not.toHaveAttribute('aria-current');
    });

    it('case-insensitive state name matching', () => {
      render(<PreviewStage slug="sample-badge" stateName="default" />);

      // Verify content renders even with lowercase stateName
      expect(screen.getByText('default badge')).toBeInTheDocument();

      // Verify the link is still marked as active (case-insensitive match)
      const defaultLink = screen.getByRole('link', { name: 'Default' });
      expect(defaultLink).toHaveAttribute('aria-current', 'page');
    });
  });

  describe('Invalid state selected', () => {
    it('shows switcher nav, error message, and no state content when state does not exist', () => {
      render(<PreviewStage slug="sample-badge" stateName="Missing" />);

      // Verify switcher nav is present
      const stateNav = screen.getByTestId('testbed-state-list');
      expect(stateNav).toBeInTheDocument();

      // Verify all state links are present and none are active
      const defaultLink = screen.getByRole('link', { name: 'Default' });
      expect(defaultLink).not.toHaveAttribute('aria-current');

      const expiringLink = screen.getByRole('link', { name: 'Expiring' });
      expect(expiringLink).not.toHaveAttribute('aria-current');

      // Verify error message is shown
      const errorMessage = screen.getByTestId('testbed-missing');
      expect(errorMessage).toHaveTextContent('No state named "Missing". Available: Default, Expiring.');

      // Verify no state content is rendered
      expect(screen.queryByText('default badge')).not.toBeInTheDocument();
      expect(screen.queryByText('expiring badge')).not.toBeInTheDocument();

      // Verify placeholder is NOT shown (different message is shown)
      expect(screen.queryByTestId('testbed-no-selection')).not.toBeInTheDocument();
    });
  });

  describe('Unknown slug', () => {
    it('shows not-found message and no switcher nav when preview slug does not exist', () => {
      render(<PreviewStage slug="unknown-slug" />);

      // Verify not-found message
      const message = screen.getByTestId('testbed-missing');
      expect(message).toHaveTextContent('No preview is registered with the slug "unknown-slug"');

      // Verify switcher nav is NOT present
      expect(screen.queryByTestId('testbed-state-list')).not.toBeInTheDocument();

      // Verify no placeholder or state content
      expect(screen.queryByTestId('testbed-no-selection')).not.toBeInTheDocument();
      expect(screen.queryByText('default badge')).not.toBeInTheDocument();
      expect(screen.queryByText('expiring badge')).not.toBeInTheDocument();
    });
  });

  describe('State link attributes and structure', () => {
    it('renders state links with correct href pattern', () => {
      render(<PreviewStage slug="sample-badge" />);

      const stateList = screen.getByTestId('testbed-state-list');
      const links = within(stateList).getAllByRole('link');

      expect(links).toHaveLength(2);
      expect(links[0]).toHaveAttribute('href', '/testbed/sample-badge?state=Default');
      expect(links[1]).toHaveAttribute('href', '/testbed/sample-badge?state=Expiring');
    });

    it('renders state sections with correct test id patterns', () => {
      render(<PreviewStage slug="sample-badge" stateName="Default" />);

      // Verify the state section exists with correct data-testid (kebab-cased)
      const stateSection = screen.getByTestId('testbed-state-default');
      expect(stateSection).toBeInTheDocument();
      expect(stateSection).toHaveTextContent('default badge');

      // Verify no other state section
      expect(screen.queryByTestId('testbed-state-expiring')).not.toBeInTheDocument();
    });

    it('renders state name as heading within the section', () => {
      render(<PreviewStage slug="sample-badge" stateName="Default" />);

      const stateSection = screen.getByTestId('testbed-state-default');
      const heading = within(stateSection).getByRole('heading', { level: 2 });
      expect(heading).toHaveTextContent('Default');
    });
  });
});
