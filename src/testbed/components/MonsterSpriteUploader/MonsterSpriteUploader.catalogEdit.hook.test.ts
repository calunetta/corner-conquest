import { act, renderHook } from '@testing-library/react';
import { toCatalogEntryKey } from '@/modules/game-rules';
import type { MonsterCatalogEntry } from '@/modules/game-rules';
import { sampleCatalog } from './MonsterSpriteUploader.fixtures';
import { useCatalogEdit } from './MonsterSpriteUploader.catalogEdit.hook';
import { AddMonsterError, deleteMonster, updateMonster } from './MonsterSpriteUploader.service';

jest.mock('./MonsterSpriteUploader.service', () => {
  class MockAddMonsterError extends Error {
    field?: string;
    constructor(message: string, field?: string) {
      super(message);
      this.field = field;
    }
  }
  return { AddMonsterError: MockAddMonsterError, updateMonster: jest.fn(), deleteMonster: jest.fn() };
});

const updateMonsterMock = jest.mocked(updateMonster);
const deleteMonsterMock = jest.mocked(deleteMonster);

const edit = { name: 'Fire Ogre', level: 2, nextLevel: 3, nextIsBoss: false } as const;
const updatedEntry: MonsterCatalogEntry = {
  name: 'Fire Ogre' as MonsterCatalogEntry['name'],
  level: 3,
  isBoss: false,
  sprite: { idle: '/monster/fire-ogre-lvl3-idle.gif' },
};

function setup() {
  const setCatalog = jest.fn();
  const view = renderHook(() => useCatalogEdit(setCatalog));
  return { setCatalog, ...view };
}

afterEach(() => jest.resetAllMocks());

describe('useCatalogEdit', () => {
  it('starts with no pending key and no error', () => {
    const { result } = setup();
    expect(result.current.pendingCatalogKey).toBeNull();
    expect(result.current.catalogEditError).toBeNull();
  });

  it('replaces only the named row on success and clears the pending key', async () => {
    updateMonsterMock.mockResolvedValue(updatedEntry);
    const { result, setCatalog } = setup();

    await act(async () => result.current.onCatalogEdit(edit));

    expect(updateMonsterMock).toHaveBeenCalledWith(edit);
    const updater = setCatalog.mock.calls[0][0] as (previous: MonsterCatalogEntry[]) => MonsterCatalogEntry[];
    const before = [...sampleCatalog];
    expect(updater(sampleCatalog)).toEqual([...sampleCatalog.slice(0, 4), updatedEntry]);
    expect(sampleCatalog).toEqual(before);
    expect(result.current.pendingCatalogKey).toBeNull();
    expect(result.current.catalogEditError).toBeNull();
  });

  it('sets the pending key to the row key while the request is in flight', async () => {
    let resolveUpdate: (entry: MonsterCatalogEntry) => void = () => undefined;
    updateMonsterMock.mockReturnValue(new Promise((resolve) => (resolveUpdate = resolve)));
    const { result } = setup();

    act(() => result.current.onCatalogEdit(edit));
    expect(result.current.pendingCatalogKey).not.toBeNull();

    await act(async () => resolveUpdate(updatedEntry));
    expect(result.current.pendingCatalogKey).toBeNull();
  });

  it('shows the AddMonsterError message and leaves the catalog alone', async () => {
    updateMonsterMock.mockRejectedValue(new AddMonsterError('Already exists.', 'level'));
    const { result, setCatalog } = setup();

    await act(async () => result.current.onCatalogEdit(edit));

    expect(result.current.catalogEditError).toBe('Already exists.');
    expect(setCatalog).not.toHaveBeenCalled();
    expect(result.current.pendingCatalogKey).toBeNull();
  });

  it('shows a generic message and logs a non-AddMonsterError', async () => {
    const failure = new TypeError('network down');
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    updateMonsterMock.mockRejectedValue(failure);
    const { result } = setup();

    await act(async () => result.current.onCatalogEdit(edit));

    expect(result.current.catalogEditError).toBe('Could not update — see console.');
    expect(consoleError).toHaveBeenCalledWith(failure);
    consoleError.mockRestore();
  });

  it('clears a previous error when a new edit starts', async () => {
    updateMonsterMock.mockRejectedValueOnce(new AddMonsterError('Boom.'));
    updateMonsterMock.mockResolvedValueOnce(updatedEntry);
    const { result } = setup();

    await act(async () => result.current.onCatalogEdit(edit));
    expect(result.current.catalogEditError).toBe('Boom.');
    await act(async () => result.current.onCatalogEdit(edit));

    expect(result.current.catalogEditError).toBeNull();
  });

  it('ignores a second edit while one is pending', async () => {
    let resolveUpdate: (entry: MonsterCatalogEntry) => void = () => undefined;
    updateMonsterMock.mockReturnValue(new Promise((resolve) => (resolveUpdate = resolve)));
    const { result } = setup();

    act(() => result.current.onCatalogEdit(edit));
    act(() => result.current.onCatalogEdit({ ...edit, nextLevel: 1 }));

    expect(updateMonsterMock).toHaveBeenCalledTimes(1);
    await act(async () => resolveUpdate(updatedEntry));
  });
});

describe('useCatalogEdit removal', () => {
  const removal = { name: 'Fire Ogre', level: 2 } as const;
  const removalKey = toCatalogEntryKey('Fire Ogre', 2);

  type CatalogUpdater = (previous: MonsterCatalogEntry[]) => MonsterCatalogEntry[];

  it('starts with nothing armed', () => {
    const { result } = setup();
    expect(result.current.removeArmedKey).toBeNull();
  });

  it('onArmRemove sets removeArmedKey to the row key and null clears it', () => {
    const { result } = setup();

    act(() => result.current.onArmRemove(removal));
    expect(result.current.removeArmedKey).toBe(removalKey);

    act(() => result.current.onArmRemove(null));
    expect(result.current.removeArmedKey).toBeNull();
  });

  it('drops only the removed row on success and clears the armed and pending keys', async () => {
    deleteMonsterMock.mockResolvedValue(undefined);
    const { result, setCatalog } = setup();
    act(() => result.current.onArmRemove(removal));

    await act(async () => result.current.onCatalogRemove(removal));

    expect(deleteMonsterMock).toHaveBeenCalledWith(removal);
    const updater = setCatalog.mock.calls[0][0] as CatalogUpdater;
    const before = [...sampleCatalog];
    expect(updater(sampleCatalog)).toEqual(sampleCatalog.slice(0, 4));
    expect(sampleCatalog).toEqual(before);
    expect(result.current.removeArmedKey).toBeNull();
    expect(result.current.pendingCatalogKey).toBeNull();
    expect(result.current.catalogEditError).toBeNull();
  });

  it('sets the pending key to the row key while the delete is in flight', async () => {
    let resolveDelete: () => void = () => undefined;
    deleteMonsterMock.mockReturnValue(new Promise<void>((resolve) => (resolveDelete = resolve)));
    const { result } = setup();

    act(() => result.current.onCatalogRemove(removal));
    expect(result.current.pendingCatalogKey).toBe(removalKey);

    await act(async () => resolveDelete());
    expect(result.current.pendingCatalogKey).toBeNull();
  });

  it('shows the AddMonsterError message, keeps the row and clears the pending key', async () => {
    deleteMonsterMock.mockRejectedValue(new AddMonsterError("Lancer is a seed monster and can't be removed."));
    const { result, setCatalog } = setup();

    await act(async () => result.current.onCatalogRemove({ name: 'Lancer', level: 1 }));

    expect(result.current.catalogEditError).toBe("Lancer is a seed monster and can't be removed.");
    expect(setCatalog).not.toHaveBeenCalled();
    expect(result.current.pendingCatalogKey).toBeNull();
  });

  it('shows a generic message and logs a non-AddMonsterError, keeping the row', async () => {
    const failure = new TypeError('network down');
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    deleteMonsterMock.mockRejectedValue(failure);
    const { result, setCatalog } = setup();

    await act(async () => result.current.onCatalogRemove(removal));

    expect(result.current.catalogEditError).toBe('Could not update — see console.');
    expect(consoleError).toHaveBeenCalledWith(failure);
    expect(setCatalog).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it('ignores a remove while another request is pending', async () => {
    let resolveUpdate: (entry: MonsterCatalogEntry) => void = () => undefined;
    updateMonsterMock.mockReturnValue(new Promise((resolve) => (resolveUpdate = resolve)));
    const { result } = setup();

    act(() => result.current.onCatalogEdit(edit));
    act(() => result.current.onCatalogRemove(removal));

    expect(deleteMonsterMock).not.toHaveBeenCalled();
    await act(async () => resolveUpdate(updatedEntry));
  });
});
