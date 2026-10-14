import type { ComponentPreview } from '@/testbed';
import { ResourceCollectionFeedbackDemo } from './ResourceCollectionFeedbackDemo';

export const resourceCollectionFeedbackDemoPreview: ComponentPreview = {
  slug: 'game-board-resource-collection-feedback',
  title: 'Resource Collection Feedback (toast + log)',
  group: 'Game Board',
  states: [
    {
      name: 'Interactive',
      render: () => <ResourceCollectionFeedbackDemo />,
    },
  ],
};
