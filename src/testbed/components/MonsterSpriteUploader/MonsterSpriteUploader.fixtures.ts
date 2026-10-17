import { SEED_MONSTER_CATALOG } from '@/modules/game-rules';
import type { MonsterCatalogEntry } from '@/modules/game-rules';
import { getLevelOptions, toCatalogRowViewModels } from './MonsterSpriteUploader.map';
import type { MonsterSpriteUploaderViewModel } from './MonsterSpriteUploader.types';

/** A non-seed entry; its sprite path follows the real filename convention. */
export const extraMonsterEntry: MonsterCatalogEntry = {
  name: 'Fire Ogre' as MonsterCatalogEntry['name'],
  level: 2,
  isBoss: false,
  sprite: { idle: '/monster/fire-ogre-lvl2-idle.gif' },
};

export const sampleCatalog: MonsterCatalogEntry[] = [...SEED_MONSTER_CATALOG, extraMonsterEntry];

export function createGifFile(name = 'fire-ogre.gif'): File {
  return new File([new Uint8Array([0x47, 0x49, 0x46, 0x38])], name, { type: 'image/gif' });
}

const noop = (): void => undefined;

export const emptyUploaderViewModel: MonsterSpriteUploaderViewModel = {
  name: '',
  level: null,
  isBoss: false,
  levelOptions: getLevelOptions(false),
  idlePreviewUrl: null,
  attackPreviewUrl: null,
  showsBossSoftWarning: false,
  canSubmit: false,
  status: 'idle',
  fieldErrors: {},
  catalogRows: toCatalogRowViewModels(sampleCatalog),
  pendingCatalogKey: null,
  catalogEditError: null,
  onCatalogEdit: noop,
  onNameChange: noop,
  onLevelChange: noop,
  onBossToggle: noop,
  onIdleFileChange: noop,
  onAttackFileChange: noop,
  onSubmit: noop,
};

export const readyUploaderViewModel: MonsterSpriteUploaderViewModel = {
  ...emptyUploaderViewModel,
  name: 'Fire Ogre',
  level: 2,
  idlePreviewUrl: '/monster/lancer-lvl1-idle.gif',
  canSubmit: true,
};
