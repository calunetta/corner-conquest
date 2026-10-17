import { act, renderHook } from '@testing-library/react';
import { MONSTER_CATALOG } from '@/modules/game-rules';
import { MAX_UPLOAD_BYTES } from '@/app/api/tile-fog-variants/upload';
import { createGifFile, extraMonsterEntry } from './MonsterSpriteUploader.fixtures';
import { useMonsterSpriteUploader } from './MonsterSpriteUploader.hook';
import { AddMonsterError, addMonster } from './MonsterSpriteUploader.service';

jest.mock('./MonsterSpriteUploader.service', () => {
  class MockAddMonsterError extends Error {
    field?: string;
    constructor(message: string, field?: string) {
      super(message);
      this.field = field;
    }
  }
  return { AddMonsterError: MockAddMonsterError, addMonster: jest.fn() };
});

const addMonsterMock = jest.mocked(addMonster);
let urlCounter = 0;
let createObjectURL: jest.Mock;
let revokeObjectURL: jest.Mock;

beforeEach(() => {
  urlCounter = 0;
  createObjectURL = jest.fn(() => `blob:mock-${++urlCounter}`);
  revokeObjectURL = jest.fn();
  Object.assign(URL, { createObjectURL, revokeObjectURL });
});

afterEach(() => {
  jest.restoreAllMocks();
  jest.clearAllMocks();
});

function pngFile(): File {
  return new File(['x'], 'a.png', { type: 'image/png' });
}

function oversizedGif(): File {
  const file = createGifFile('big.gif');
  Object.defineProperty(file, 'size', { value: MAX_UPLOAD_BYTES + 1 });
  return file;
}

function fillValidForm(result: { current: ReturnType<typeof useMonsterSpriteUploader> }): void {
  act(() => result.current.onNameChange('Fire Ogre'));
  act(() => result.current.onLevelChange(2));
  act(() => result.current.onIdleFileChange(createGifFile()));
}

describe('useMonsterSpriteUploader', () => {
  it('starts empty with the static catalog and a disabled submit', () => {
    const { result } = renderHook(() => useMonsterSpriteUploader());

    expect(result.current.name).toBe('');
    expect(result.current.level).toBeNull();
    expect(result.current.isBoss).toBe(false);
    expect(result.current.status).toBe('idle');
    expect(result.current.fieldErrors).toEqual({});
    expect(result.current.canSubmit).toBe(false);
    expect(result.current.catalogRows).toHaveLength(MONSTER_CATALOG.length);
  });

  describe('boss toggle', () => {
    it('toggling Boss off at level 4 clamps the level to 3', () => {
      const { result } = renderHook(() => useMonsterSpriteUploader());
      act(() => result.current.onBossToggle(true));
      act(() => result.current.onLevelChange(4));

      act(() => result.current.onBossToggle(false));

      expect(result.current.isBoss).toBe(false);
      expect(result.current.level).toBe(3);
      expect(result.current.levelOptions.map((option) => option.value)).toEqual([1, 2, 3]);
    });

    it('toggling Boss on at level 2 keeps level 2 and shows the soft warning', () => {
      const { result } = renderHook(() => useMonsterSpriteUploader());
      act(() => result.current.onLevelChange(2));

      act(() => result.current.onBossToggle(true));

      expect(result.current.level).toBe(2);
      expect(result.current.showsBossSoftWarning).toBe(true);
    });

    it('toggling Boss with no level leaves the level null', () => {
      const { result } = renderHook(() => useMonsterSpriteUploader());
      act(() => result.current.onBossToggle(true));
      expect(result.current.level).toBeNull();
    });
  });

  describe('preview object URLs', () => {
    it('creates an object URL on pick', () => {
      const { result } = renderHook(() => useMonsterSpriteUploader());
      const file = createGifFile();

      act(() => result.current.onIdleFileChange(file));

      expect(createObjectURL).toHaveBeenCalledTimes(1);
      expect(createObjectURL).toHaveBeenCalledWith(file);
      expect(result.current.idlePreviewUrl).toBe('blob:mock-1');
      expect(result.current.attackPreviewUrl).toBeNull();
    });

    it('revokes the previous URL when the file is replaced', () => {
      const { result } = renderHook(() => useMonsterSpriteUploader());
      act(() => result.current.onIdleFileChange(createGifFile('one.gif')));

      act(() => result.current.onIdleFileChange(createGifFile('two.gif')));

      expect(revokeObjectURL).toHaveBeenCalledTimes(1);
      expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock-1');
      expect(result.current.idlePreviewUrl).toBe('blob:mock-2');
    });

    it('revokes the URL on unmount', () => {
      const { result, unmount } = renderHook(() => useMonsterSpriteUploader());
      act(() => result.current.onAttackFileChange(createGifFile()));
      expect(revokeObjectURL).not.toHaveBeenCalled();

      unmount();

      expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock-1');
    });

    it('clears the preview and revokes the URL when the file is removed', () => {
      const { result } = renderHook(() => useMonsterSpriteUploader());
      act(() => result.current.onIdleFileChange(createGifFile()));

      act(() => result.current.onIdleFileChange(null));

      expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock-1');
      expect(result.current.idlePreviewUrl).toBeNull();
    });
  });

  describe('invalid picks', () => {
    it.each([
      { kind: 'idle', previewKey: 'idlePreviewUrl', pick: 'onIdleFileChange' },
      { kind: 'attack', previewKey: 'attackPreviewUrl', pick: 'onAttackFileChange' },
    ] as const)('a non-GIF $kind pick sets the error, creates no URL and stores no file', ({ kind, previewKey, pick }) => {
      const { result } = renderHook(() => useMonsterSpriteUploader());

      act(() => result.current[pick](pngFile()));

      expect(result.current[previewKey]).toBeNull();
      expect(result.current.fieldErrors[kind]).toBe(`The ${kind} sprite must be a GIF.`);
      expect(createObjectURL).not.toHaveBeenCalled();
    });

    it('an oversized GIF pick sets the size error and leaves the preview null', () => {
      const { result } = renderHook(() => useMonsterSpriteUploader());

      act(() => result.current.onIdleFileChange(oversizedGif()));

      expect(result.current.idlePreviewUrl).toBeNull();
      expect(result.current.fieldErrors.idle).toBe('Each file must be 2 MB or smaller.');
    });

    it('an invalid pick replacing a valid file drops the stored file, so submit stays disabled', () => {
      const { result } = renderHook(() => useMonsterSpriteUploader());
      fillValidForm(result);
      expect(result.current.canSubmit).toBe(true);

      act(() => result.current.onIdleFileChange(pngFile()));

      expect(result.current.idlePreviewUrl).toBeNull();
      expect(result.current.canSubmit).toBe(false);
    });

    it('a later valid pick clears the field error', () => {
      const { result } = renderHook(() => useMonsterSpriteUploader());
      act(() => result.current.onIdleFileChange(pngFile()));

      act(() => result.current.onIdleFileChange(createGifFile()));

      expect(result.current.fieldErrors.idle).toBeUndefined();
      expect(result.current.idlePreviewUrl).toBe('blob:mock-1');
    });
  });

  describe('canSubmit', () => {
    it('is false without an idle file', () => {
      const { result } = renderHook(() => useMonsterSpriteUploader());
      act(() => result.current.onNameChange('Fire Ogre'));
      act(() => result.current.onLevelChange(2));
      expect(result.current.canSubmit).toBe(false);
    });

    it.each(['', '   '])('is false with the blank name "%s"', (name) => {
      const { result } = renderHook(() => useMonsterSpriteUploader());
      act(() => result.current.onNameChange(name));
      act(() => result.current.onLevelChange(2));
      act(() => result.current.onIdleFileChange(createGifFile()));
      expect(result.current.canSubmit).toBe(false);
    });

    it('is false without a level', () => {
      const { result } = renderHook(() => useMonsterSpriteUploader());
      act(() => result.current.onNameChange('Fire Ogre'));
      act(() => result.current.onIdleFileChange(createGifFile()));
      expect(result.current.canSubmit).toBe(false);
    });

    it('is true with a name, level and idle file', () => {
      const { result } = renderHook(() => useMonsterSpriteUploader());
      fillValidForm(result);
      expect(result.current.canSubmit).toBe(true);
    });

    it('is false while a submit is in flight', () => {
      addMonsterMock.mockReturnValue(new Promise(() => undefined));
      const { result } = renderHook(() => useMonsterSpriteUploader());
      fillValidForm(result);

      act(() => result.current.onSubmit());

      expect(result.current.status).toBe('submitting');
      expect(result.current.canSubmit).toBe(false);
    });
  });

  describe('onSubmit', () => {
    it('sends the form values to the service', async () => {
      addMonsterMock.mockResolvedValue(extraMonsterEntry);
      const { result } = renderHook(() => useMonsterSpriteUploader());
      fillValidForm(result);
      act(() => result.current.onBossToggle(true));

      await act(async () => result.current.onSubmit());

      expect(addMonsterMock).toHaveBeenCalledTimes(1);
      expect(addMonsterMock).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Fire Ogre', level: 2, isBoss: true, attackFile: null }),
      );
    });

    it('on success appends the returned entry, sets success and resets every field', async () => {
      addMonsterMock.mockResolvedValue(extraMonsterEntry);
      const { result } = renderHook(() => useMonsterSpriteUploader());
      fillValidForm(result);
      act(() => result.current.onAttackFileChange(createGifFile('attack.gif')));

      await act(async () => result.current.onSubmit());

      expect(result.current.status).toBe('success');
      expect(result.current.name).toBe('');
      expect(result.current.level).toBeNull();
      expect(result.current.isBoss).toBe(false);
      expect(result.current.idlePreviewUrl).toBeNull();
      expect(result.current.attackPreviewUrl).toBeNull();
      expect(result.current.fieldErrors).toEqual({});
      expect(result.current.canSubmit).toBe(false);
      expect(result.current.catalogRows).toHaveLength(MONSTER_CATALOG.length + 1);
      expect(result.current.catalogRows[MONSTER_CATALOG.length]).toEqual({
        name: 'Fire Ogre',
        level: 2,
        isBoss: false,
        idleSprite: '/monster/fire-ogre-lvl2-idle.gif',
        isSeed: false,
        isEditable: true,
        levelOptions: [
          { value: 1, label: '1 — Little' },
          { value: 2, label: '2 — Little' },
          { value: 3, label: '3 — Big' },
        ],
      });
    });

    it('on AddMonsterError with a field sets that field error and keeps the form filled', async () => {
      addMonsterMock.mockRejectedValue(new AddMonsterError('Already exists.', 'name'));
      const { result } = renderHook(() => useMonsterSpriteUploader());
      fillValidForm(result);

      await act(async () => result.current.onSubmit());

      expect(result.current.fieldErrors).toEqual({ name: 'Already exists.' });
      expect(result.current.name).toBe('Fire Ogre');
      expect(result.current.level).toBe(2);
      expect(result.current.idlePreviewUrl).not.toBeNull();
      expect(result.current.catalogRows).toHaveLength(MONSTER_CATALOG.length);
    });

    it('on AddMonsterError without a field sets status error, logs it and keeps the form filled', async () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);
      const error = new AddMonsterError('Server broke');
      addMonsterMock.mockRejectedValue(error);
      const { result } = renderHook(() => useMonsterSpriteUploader());
      fillValidForm(result);

      await act(async () => result.current.onSubmit());

      expect(result.current.status).toBe('error');
      expect(result.current.fieldErrors).toEqual({});
      expect(result.current.name).toBe('Fire Ogre');
      expect(consoleError).toHaveBeenCalledWith(error);
    });

    it('on a non-AddMonsterError rejection sets status error and logs it', async () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);
      const error = new TypeError('network down');
      addMonsterMock.mockRejectedValue(error);
      const { result } = renderHook(() => useMonsterSpriteUploader());
      fillValidForm(result);

      await act(async () => result.current.onSubmit());

      expect(result.current.status).toBe('error');
      expect(consoleError).toHaveBeenCalledWith(error);
    });

    it('without a name, level or idle file sets client errors and never calls the service', () => {
      const { result } = renderHook(() => useMonsterSpriteUploader());

      act(() => result.current.onSubmit());

      expect(addMonsterMock).not.toHaveBeenCalled();
      expect(result.current.status).toBe('error');
      expect(result.current.fieldErrors.name).toBe('Name needs at least one letter or digit.');
      expect(result.current.fieldErrors.idle).toBe('An idle sprite is required.');
    });
  });

  describe('editing clears errors', () => {
    it('editing the name clears the name error', async () => {
      addMonsterMock.mockRejectedValue(new AddMonsterError('Already exists.', 'name'));
      const { result } = renderHook(() => useMonsterSpriteUploader());
      fillValidForm(result);
      await act(async () => result.current.onSubmit());
      expect(result.current.fieldErrors.name).toBe('Already exists.');

      act(() => result.current.onNameChange('Fire Ogre 2'));

      expect(result.current.fieldErrors.name).toBeUndefined();
    });

    it('editing the level clears the level error', async () => {
      addMonsterMock.mockRejectedValue(new AddMonsterError('Bad level.', 'level'));
      const { result } = renderHook(() => useMonsterSpriteUploader());
      fillValidForm(result);
      await act(async () => result.current.onSubmit());
      expect(result.current.fieldErrors.level).toBe('Bad level.');

      act(() => result.current.onLevelChange(1));

      expect(result.current.fieldErrors.level).toBeUndefined();
    });

    it('toggling Boss clears the level error', async () => {
      addMonsterMock.mockRejectedValue(new AddMonsterError('Bad level.', 'level'));
      const { result } = renderHook(() => useMonsterSpriteUploader());
      fillValidForm(result);
      await act(async () => result.current.onSubmit());

      act(() => result.current.onBossToggle(true));

      expect(result.current.fieldErrors.level).toBeUndefined();
    });
  });
});
