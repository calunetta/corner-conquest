import type { ComponentPreview } from '@/testbed';
import { GoogleIcon } from './GoogleIcon';

export const googleIconPreview: ComponentPreview = {
  slug: 'session-google-icon',
  title: 'Google icon',
  group: 'Session',
  states: [{ name: 'Default', render: () => <GoogleIcon /> }],
};
