import type { MonsterCatalogEntry } from '@/modules/game-rules';

export type MonsterLevel = 1 | 2 | 3 | 4;

export type UploadField = 'name' | 'level' | 'idle' | 'attack';

export interface MonsterCatalogRowViewModel {
  name: string;
  level: MonsterLevel;
  isBoss: boolean;
  idleSprite: string;
  isSeed: boolean;
  /** Uploaded monsters can change level and Boss; seed monsters are fixed. */
  isEditable: boolean;
  levelOptions: LevelOption[];
}

/** A level and/or Boss change to one catalog row, identified by its current name and level. */
export interface CatalogEdit {
  name: string;
  level: MonsterLevel;
  nextLevel: MonsterLevel;
  nextIsBoss: boolean;
}

export interface LevelOption {
  value: MonsterLevel;
  label: string;
}

/** Removes one uploaded catalog row, identified by its name and level. */
export interface CatalogRemoval {
  name: string;
  level: MonsterLevel;
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
  /** Key (see toCatalogEntryKey) of the row whose edit is in flight. */
  pendingCatalogKey: string | null;
  catalogEditError: string | null;
  onCatalogEdit: (edit: CatalogEdit) => void;
  removeArmedKey: string | null;
  onArmRemove: (removal: CatalogRemoval | null) => void;
  onCatalogRemove: (removal: CatalogRemoval) => void;
  onNameChange: (name: string) => void;
  onLevelChange: (level: MonsterLevel) => void;
  onBossToggle: (isBoss: boolean) => void;
  onIdleFileChange: (file: File | null) => void;
  onAttackFileChange: (file: File | null) => void;
  onSubmit: () => void;
}

/** Body the PATCH route returns on success. */
export type UpdateMonsterResponseBody = AddMonsterResponseBody;

/** Body the POST route returns on success. */
export interface AddMonsterResponseBody {
  entry: MonsterCatalogEntry;
}

/** Body the POST route returns on a 400/409/413. */
export interface AddMonsterErrorBody {
  error: string;
  field?: UploadField;
}
