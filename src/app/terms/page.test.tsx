import { render, screen } from '@testing-library/react';
import TermsOfServicePage from './page';

const DRAFT_BANNER = 'DRAFT — pending lawyer review. This is not legal advice.';

const REQUIRED_SECTION_HEADINGS = [
  'Acceptance of terms',
  'The service',
  'Accounts',
  'Minors',
  'Acceptable use',
  'Disclaimer of warranties',
  'Limitation of liability',
  'Changes to these terms',
  'Governing law',
  'Contact',
];

describe('TermsOfServicePage', () => {
  beforeEach(() => {
    render(<TermsOfServicePage />);
  });

  it('renders the page title as the main heading', () => {
    expect(screen.getByRole('heading', { level: 1, name: 'Terms of Service' })).toBeInTheDocument();
  });

  it('shows the DRAFT banner with the exact status text', () => {
    expect(screen.getByText(DRAFT_BANNER)).toBeInTheDocument();
  });

  it('marks the DRAFT text as a note for assistive technology', () => {
    expect(screen.getByRole('note')).toHaveTextContent(DRAFT_BANNER);
  });

  it.each(REQUIRED_SECTION_HEADINGS)('renders the "%s" section heading', (name) => {
    expect(screen.getByRole('heading', { level: 2, name })).toBeInTheDocument();
  });

  it('describes sign-in with Google through Firebase Authentication', () => {
    expect(screen.getByText(/sign in with Google through Firebase Authentication/)).toBeInTheDocument();
  });

  it('asks for a parent or guardian permission for players under 16', () => {
    expect(screen.getByText(/under 16/)).toBeInTheDocument();
    expect(screen.getByText(/parent or guardian/)).toBeInTheDocument();
  });

  it('shows the governing law placeholder', () => {
    expect(screen.getByText('[Governing law / jurisdiction placeholder]')).toBeInTheDocument();
  });

  it('shows the contact placeholder', () => {
    expect(screen.getByText('[Contact email placeholder]')).toBeInTheDocument();
  });

  it('links back to the home page', () => {
    expect(screen.getByRole('link', { name: 'Back to Corner Conquest' })).toHaveAttribute(
      'href',
      '/',
    );
  });
});
