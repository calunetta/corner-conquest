import { render, screen, within } from '@testing-library/react';
import PrivacyPolicyPage from './page';

const DRAFT_BANNER = 'DRAFT — pending lawyer review. This is not legal advice.';

const REQUIRED_SECTION_HEADINGS = [
  'Who we are',
  'Data we collect',
  'Processors',
  'Advertising cookies and consent',
  'Minors',
  'Retention',
  'Your rights and deletion',
  'Contact',
];

describe('PrivacyPolicyPage', () => {
  beforeEach(() => {
    render(<PrivacyPolicyPage />);
  });

  it('renders the page title as the main heading', () => {
    expect(screen.getByRole('heading', { level: 1, name: 'Privacy Policy' })).toBeInTheDocument();
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

  it('describes the data collected from Google sign-in (uid and displayName)', () => {
    const section = screen
      .getByRole('heading', { level: 2, name: 'Data we collect' })
      .closest('section');
    expect(section).not.toBeNull();
    expect(within(section as HTMLElement).getByText(/uid/)).toBeInTheDocument();
    expect(within(section as HTMLElement).getByText(/displayName/)).toBeInTheDocument();
  });

  it('names Firestore as the place game state is stored', () => {
    expect(screen.getAllByText(/Firestore/).length).toBeGreaterThanOrEqual(1);
  });

  it('names Google Funding Choices as the consent source for ads', () => {
    expect(screen.getByText(/Google Funding Choices/)).toBeInTheDocument();
  });

  it('states that players under 16 are never served personalized ads', () => {
    expect(screen.getByText(/under 16/)).toBeInTheDocument();
    expect(screen.getByText(/never served personalized ads/)).toBeInTheDocument();
  });

  it('shows the operator identity placeholder', () => {
    expect(
      screen.getByText('[Operator legal name and address placeholder]'),
    ).toBeInTheDocument();
  });

  it('shows the contact placeholder', () => {
    expect(screen.getByText('[Contact email placeholder]')).toBeInTheDocument();
  });

  it('does not claim account deletion is already available', () => {
    expect(screen.queryByText(/account deletion is available/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/you can delete your account/i)).not.toBeInTheDocument();
    expect(screen.getByText(/is not available yet/)).toBeInTheDocument();
  });

  it('links back to the home page', () => {
    expect(screen.getByRole('link', { name: 'Back to Corner Conquest' })).toHaveAttribute(
      'href',
      '/',
    );
  });
});
