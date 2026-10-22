export interface SiteFooterLink {
  href: string;
  label: string;
}

export const SITE_FOOTER_LINKS: readonly SiteFooterLink[] = [
  { href: '/privacy', label: 'Privacy Policy' },
  { href: '/terms', label: 'Terms of Service' },
  { href: '/thanks', label: 'Thanks' },
];
