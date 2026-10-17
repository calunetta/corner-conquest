import { useEffect, useState } from 'react';
import { MONSTER_CATALOG } from '@/modules/game-rules';
import type { MonsterCatalogEntry } from '@/modules/game-rules';
import {
  clampLevelForBossFlag,
  getLevelOptions,
  showsBossSoftWarning,
  toCatalogRowViewModels,
  validateMonsterName,
  validateSpriteFile,
} from './MonsterSpriteUploader.map';
import { AddMonsterError, addMonster } from './MonsterSpriteUploader.service';
import type {
  FieldErrors,
  MonsterLevel,
  MonsterSpriteUploaderViewModel,
  UploadField,
  UploadStatus,
} from './MonsterSpriteUploader.types';

const MISSING_IDLE_MESSAGE = 'An idle sprite is required.';

/** Object URL for a picked file; revoked when the file is replaced, cleared or on unmount. */
function useObjectUrl(file: File | null): string | null {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setUrl(null);
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  return url;
}

function validateForm(name: string, idleFile: File | null, attackFile: File | null): FieldErrors {
  const errors: FieldErrors = {};
  const nameError = validateMonsterName(name);
  if (nameError) errors.name = nameError;
  const idleError = idleFile ? validateSpriteFile(idleFile, 'idle') : MISSING_IDLE_MESSAGE;
  if (idleError) errors.idle = idleError;
  const attackError = attackFile ? validateSpriteFile(attackFile, 'attack') : null;
  if (attackError) errors.attack = attackError;
  return errors;
}

/** Owns the add-monster form: field state, preview object URLs, submit flow and the local
 *  catalog list (seeded from the static catalog, appended with the server's returned entry). */
export function useMonsterSpriteUploader(): MonsterSpriteUploaderViewModel {
  const [name, setName] = useState('');
  const [level, setLevel] = useState<MonsterLevel | null>(null);
  const [isBoss, setIsBoss] = useState(false);
  const [idleFile, setIdleFile] = useState<File | null>(null);
  const [attackFile, setAttackFile] = useState<File | null>(null);
  const [status, setStatus] = useState<UploadStatus>('idle');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [catalog, setCatalog] = useState<MonsterCatalogEntry[]>(MONSTER_CATALOG);
  const idlePreviewUrl = useObjectUrl(idleFile);
  const attackPreviewUrl = useObjectUrl(attackFile);

  const resetFields = (): void => {
    setName('');
    setLevel(null);
    setIsBoss(false);
    setIdleFile(null);
    setAttackFile(null);
  };

  const setFieldError = (field: UploadField, message?: string): void =>
    setFieldErrors((previous) => ({ ...previous, [field]: message }));

  const onNameChange = (nextName: string): void => {
    setName(nextName);
    setFieldError('name');
  };

  const onLevelChange = (nextLevel: MonsterLevel): void => {
    setLevel(nextLevel);
    setFieldError('level');
  };

  const onBossToggle = (nextIsBoss: boolean): void => {
    setIsBoss(nextIsBoss);
    setLevel(clampLevelForBossFlag(level, nextIsBoss));
    setFieldError('level');
  };

  // An invalid pick is rejected here (error shown, file not kept) so it never reaches submit.
  const pickSpriteFile = (kind: 'idle' | 'attack', file: File | null): void => {
    const error = file ? validateSpriteFile(file, kind) : null;
    const acceptedFile = error ? null : file;
    if (kind === 'idle') setIdleFile(acceptedFile);
    else setAttackFile(acceptedFile);
    setFieldError(kind, error ?? undefined);
  };

  const onSubmit = (): void => {
    const errors = validateForm(name, idleFile, attackFile);
    if (level === null || !idleFile || Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setStatus('error');
      return;
    }

    setFieldErrors({});
    setStatus('submitting');
    addMonster({ name, level, isBoss, idleFile, attackFile })
      .then((entry) => {
        setCatalog((previous) => [...previous, entry]);
        resetFields();
        setStatus('success');
      })
      .catch((error: unknown) => {
        setStatus('error');
        if (error instanceof AddMonsterError && error.field) {
          setFieldErrors({ [error.field]: error.message });
          return;
        }
        console.error(error);
      });
  };

  return {
    name,
    level,
    isBoss,
    levelOptions: getLevelOptions(isBoss),
    idlePreviewUrl,
    attackPreviewUrl,
    showsBossSoftWarning: showsBossSoftWarning(isBoss, level),
    canSubmit: name.trim() !== '' && level !== null && idleFile !== null && status !== 'submitting',
    status,
    fieldErrors,
    catalogRows: toCatalogRowViewModels(catalog),
    onNameChange,
    onLevelChange,
    onBossToggle,
    onIdleFileChange: (file) => pickSpriteFile('idle', file),
    onAttackFileChange: (file) => pickSpriteFile('attack', file),
    onSubmit,
  };
}
