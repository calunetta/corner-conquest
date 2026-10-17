import type { MonsterCatalogEntry } from '@/modules/game-rules';

export type MonsterLevel = 1 | 2 | 3 | 4;

export type UploadField = 'name' | 'level' | 'idle' | 'attack';

export interface MonsterCatalogRowViewModel {
  name: string;
  level: MonsterLevel;
  isBoss: boolean;
  idleSprite: string;
  isSeed: boolean;
}

export interface LevelOption {
  value: MonsterLevel;
  label: string;
}

export type UploadStatus = 'idle' | 'submitting' | 'success' | 'error';

export type FieldErrors = Partial<Record<UploadField, string>>;

export interface MonsterSpriteUploaderViewModel {
  name: string;
  level: MonsterLevel | null;
  isBoss: boolean;
  levelOptions: LevelOption[];
  idlePreviewUrl: string | null;
  attackPreviewUrl: string | null;
  showsBossSoftWarning: boolean;
  canSubmit: boolean;
  status: UploadStatus;
  fieldErrors: FieldErrors;
  catalogRows: MonsterCatalogRowViewModel[];
  onNameChange: (name: string) => void;
  onLevelChange: (level: MonsterLevel) => void;
  onBossToggle: (isBoss: boolean) => void;
  onIdleFileChange: (file: File | null) => void;
  onAttackFileChange: (file: File | null) => void;
  onSubmit: () => void;
}

/** Body the POST route returns on success. */
export interface AddMonsterResponseBody {
  entry: MonsterCatalogEntry;
}

/** Body the POST route returns on a 400/409/413. */
export interface AddMonsterErrorBody {
  error: string;
  field?: UploadField;
}
