import type { ComponentPreview } from '@/testbed/testbed.types';
import { MonsterSpriteUploader } from './MonsterSpriteUploader';

export const monsterSpriteUploaderPreview: ComponentPreview = {
  slug: 'monster-sprite-uploader',
  title: 'Monster Sprite Uploader',
  group: 'Dev tools',
  states: [
    { name: 'Uploader', render: () => <MonsterSpriteUploader /> },
  ],
};
