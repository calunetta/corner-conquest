import { render, screen } from '@testing-library/react';
import { SiteFooter } from './SiteFooter';
import { SITE_FOOTER_LINKS } from './SiteFooter.links';

describe('SiteFooter', () => {
  it('links to every listed page', () => {
    render(<SiteFooter />);

    SITE_FOOTER_LINKS.forEach(({ href, label }) => {
      expect(screen.getByRole('link', { name: label })).toHaveAttribute('href', href);
    });
  });

  it('lists the privacy, terms and thanks pages', () => {
    render(<SiteFooter />);

    expect(screen.getByRole('link', { name: 'Privacy Policy' })).toHaveAttribute('href', '/privacy');
    expect(screen.getByRole('link', { name: 'Terms of Service' })).toHaveAttribute('href', '/terms');
    expect(screen.getByRole('link', { name: 'Thanks' })).toHaveAttribute('href', '/thanks');
  });
});
