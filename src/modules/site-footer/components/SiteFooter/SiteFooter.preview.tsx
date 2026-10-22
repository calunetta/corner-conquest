import type { ComponentPreview } from '@/testbed';
import { SiteFooter } from './SiteFooter';

export const siteFooterPreview: ComponentPreview = {
  slug: 'site-footer',
  title: 'Site footer',
  group: 'Shared',
  states: [{ name: 'Default', render: () => <SiteFooter /> }],
};
