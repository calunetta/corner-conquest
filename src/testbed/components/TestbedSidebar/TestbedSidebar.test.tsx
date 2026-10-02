import { render, screen } from '@testing-library/react';
import { TestbedSidebarView } from './TestbedSidebar';
import { sampleGroups, emptyGroups } from './TestbedSidebar.fixtures';

describe('TestbedSidebarView', () => {
  describe('renders all previews with correct links', () => {
    it('renders a link for each preview with correct href and data-testid', () => {
      render(<TestbedSidebarView groups={sampleGroups} pathname="/testbed" />);

      expect(screen.getByTestId('testbed-link-hud-player-standings')).toHaveAttribute('href', '/testbed/hud-player-standings');
      expect(screen.getByTestId('testbed-link-legacy-map-zoom')).toHaveAttribute('href', '/testbed/legacy-map-zoom');
      expect(screen.getByTestId('testbed-link-legacy-sabotage-dialog')).toHaveAttribute('href', '/testbed/legacy-sabotage-dialog');
    });
  });

  describe('renders groups and sections', () => {
    it('renders one labelled region per group', () => {
      render(<TestbedSidebarView groups={sampleGroups} pathname="/testbed" />);

      const hudSection = screen.getByRole('region', { name: 'HUD' });
      const legacySection = screen.getByRole('region', { name: 'Legacy' });

      expect(hudSection).toBeInTheDocument();
      expect(legacySection).toBeInTheDocument();
    });

    it('renders group titles as h2', () => {
      render(<TestbedSidebarView groups={sampleGroups} pathname="/testbed" />);

      const headers = screen.getAllByRole('heading', { level: 2 });
      expect(headers).toHaveLength(2);
      expect(headers[0]).toHaveTextContent('HUD');
      expect(headers[1]).toHaveTextContent('Legacy');
    });
  });

  describe('empty registry', () => {
    it('renders "No previews registered yet." when groups are empty', () => {
      render(<TestbedSidebarView groups={emptyGroups} pathname="/testbed" />);

      expect(screen.getByText('No previews registered yet.')).toBeInTheDocument();
    });

    it('does not render sections when groups are empty', () => {
      render(<TestbedSidebarView groups={emptyGroups} pathname="/testbed" />);

      expect(screen.queryByRole('region')).not.toBeInTheDocument();
    });
  });

  describe('active row selection', () => {
    it('sets aria-current="page" on the matching row', () => {
      render(<TestbedSidebarView groups={sampleGroups} pathname="/testbed/legacy-map-zoom" />);

      const activeLink = screen.getByTestId('testbed-link-legacy-map-zoom');
      expect(activeLink).toHaveAttribute('aria-current', 'page');
    });

    it('does not set aria-current on non-matching rows', () => {
      render(<TestbedSidebarView groups={sampleGroups} pathname="/testbed/legacy-map-zoom" />);

      const hudLink = screen.getByTestId('testbed-link-hud-player-standings');
      const sabotageLink = screen.getByTestId('testbed-link-legacy-sabotage-dialog');

      expect(hudLink).not.toHaveAttribute('aria-current');
      expect(sabotageLink).not.toHaveAttribute('aria-current');
    });

    it('does not set aria-current on any row when pathname is /testbed', () => {
      render(<TestbedSidebarView groups={sampleGroups} pathname="/testbed" />);

      const links = screen.getAllByTestId(/^testbed-link-/);
      links.forEach((link) => {
        expect(link).not.toHaveAttribute('aria-current');
      });
    });

    it('tolerates a trailing slash in pathname when matching', () => {
      render(<TestbedSidebarView groups={sampleGroups} pathname="/testbed/legacy-map-zoom/" />);

      const activeLink = screen.getByTestId('testbed-link-legacy-map-zoom');
      expect(activeLink).toHaveAttribute('aria-current', 'page');
    });
  });

  describe('state pluralization', () => {
    it('displays "1 state" for a single-state preview', () => {
      render(<TestbedSidebarView groups={sampleGroups} pathname="/testbed" />);

      const mapZoomRow = screen.getByTestId('testbed-link-legacy-map-zoom');
      expect(mapZoomRow).toHaveTextContent('1 state');
    });

    it('displays "N states" for multi-state previews', () => {
      render(<TestbedSidebarView groups={sampleGroups} pathname="/testbed" />);

      const hudRow = screen.getByTestId('testbed-link-hud-player-standings');
      expect(hudRow).toHaveTextContent('2 states');

      const sabotageRow = screen.getByTestId('testbed-link-legacy-sabotage-dialog');
      expect(sabotageRow).toHaveTextContent('2 states');
    });
  });

  describe('sidebar nav structure', () => {
    it('renders exactly one nav with aria-label "Components"', () => {
      render(<TestbedSidebarView groups={sampleGroups} pathname="/testbed" />);

      const nav = screen.getByRole('navigation', { name: 'Components' });
      expect(nav).toBeInTheDocument();
    });

    it('renders the sidebar title as a link to /testbed', () => {
      render(<TestbedSidebarView groups={sampleGroups} pathname="/testbed" />);

      const titleLink = screen.getByRole('link', { name: 'Component testbed' });
      expect(titleLink).toHaveAttribute('href', '/testbed');
    });
  });

  describe('mobile visibility class handling', () => {
    it('renders nav that the parent can style for mobile collapse', () => {
      const { container } = render(<TestbedSidebarView groups={sampleGroups} pathname="/testbed" />);

      const nav = container.querySelector('nav');
      expect(nav).toBeInTheDocument();
    });
  });
});
