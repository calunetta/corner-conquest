import { render, screen } from '@testing-library/react';
import ThanksPage from './page';

describe('ThanksPage', () => {
  beforeEach(() => {
    render(<ThanksPage />);
  });

  it('renders the page title as the main heading', () => {
    expect(screen.getByRole('heading', { level: 1, name: 'Thanks' })).toBeInTheDocument();
  });

  it('thanks Pixel Frog for Tiny Swords', () => {
    expect(screen.getByRole('heading', { name: 'Tiny Swords by Pixel Frog' })).toBeInTheDocument();
  });

  it('links to the Tiny Swords itch.io page in a new tab', () => {
    const link = screen.getByRole('link', { name: 'Tiny Swords on itch.io' });

    expect(link).toHaveAttribute('href', 'https://pixelfrog-assets.itch.io/tiny-swords');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'));
  });

  it('links to the creator profile', () => {
    expect(screen.getByRole('link', { name: 'Pixel Frog' })).toHaveAttribute(
      'href',
      'https://pixelfrog-assets.itch.io',
    );
  });

  it('links back to the game', () => {
    expect(screen.getByRole('link', { name: 'Back to Corner Conquest' })).toHaveAttribute('href', '/');
  });
});
