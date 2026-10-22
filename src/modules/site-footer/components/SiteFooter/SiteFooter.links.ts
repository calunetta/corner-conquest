export interface SiteFooterLink {
  href: string;
  label: string;
}

// Add '/thanks' here when that page lands (docs/ai/tasks/2026-10-22-thanks-page-tiny-swords).
export const SITE_FOOTER_LINKS: readonly SiteFooterLink[] = [
  { href: '/privacy', label: 'Privacy Policy' },
  { href: '/terms', label: 'Terms of Service' },
];
