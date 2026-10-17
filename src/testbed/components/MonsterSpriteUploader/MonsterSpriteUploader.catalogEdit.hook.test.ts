import { act, renderHook, waitFor } from '@testing-library/react';
import { toCatalogEntryKey } from '@/modules/game-rules';
import type { MonsterCatalogEntry } from '@/modules/game-rules';
import { sampleCatalog } from './MonsterSpriteUploader.fixtures';
import { useCatalogEdit } from './MonsterSpriteUploader.catalogEdit.hook';
import { AddMonsterError, deleteMonster, loadCatalog, updateMonster } from './MonsterSpriteUploader.service';

jest.mock('./MonsterSpriteUploader.service', () => {
  class MockAddMonsterError extends Error {
    field?: string;
    newer?: { entries: unknown[]; sha: string };
    constructor(message: string, field?: string, newer?: { entries: unknown[]; sha: string }) {
      super(message);
      this.field = field;
      this.newer = newer;
    }
  }
  return {
    AddMonsterError: MockAddMonsterError,
    loadCatalog: jest.fn(),
    updateMonster: jest.fn(),
    deleteMonster: jest.fn(),
  };
});

const loadCatalogMock = jest.mocked(loadCatalog);
const updateMonsterMock = jest.mocked(updateMonster);
const deleteMonsterMock = jest.mocked(deleteMonster);

const edit = { name: 'Fire Ogre', level: 2, nextLevel: 3, nextIsBoss: false } as const;
const removal = { name: 'Fire Ogre', level: 2 } as const;
const updatedEntry: MonsterCatalogEntry = {
  name: 'Fire Ogre' as MonsterCatalogEntry['name'],
  level: 3,
  isBoss: false,
  sprite: { idle: '/monster/fire-ogre-lvl3-idle.gif' },
};
const savedCatalog = { entries: [...sampleCatalog.slice(0, 4), updatedEntry], sha: 'next-sha', pullRequestUrl: null };

async function setup() {
  const setCatalog = jest.fn();
  const view = renderHook(() => useCatalogEdit(setCatalog));
  await waitFor(() => expect(loadCatalogMock).toHaveBeenCalled());
  await act(async () => {});
  return { setCatalog, ...view };
}

beforeEach(() => {
  loadCatalogMock.mockResolvedValue({ entries: sampleCatalog, sha: 'loaded-sha' });
});

afterEach(() => jest.resetAllMocks());

describe('useCatalogEdit', () => {
  it('loads the saved catalog on open and starts with no pending key and no error', async () => {
    const { result, setCatalog } = await setup();

    expect(setCatalog).toHaveBeenCalledWith(sampleCatalog);
    expect(result.current.pendingCatalogKey).toBeNull();
    expect(result.current.catalogEditError).toBeNull();
  });

  it('reports a failed load as an error', async () => {
    loadCatalogMock.mockRejectedValueOnce(new Error('offline'));

    const { result } = await setup();

    expect(result.current.catalogEditError).toBe('Could not load the saved catalog: offline');
  });

  it('sends the loaded sha with the edit and applies the saved catalog from the reply', async () => {
    updateMonsterMock.mockResolvedValue(savedCatalog);
    const { result, setCatalog } = await setup();

    await act(async () => result.current.onCatalogEdit(edit));

    expect(updateMonsterMock).toHaveBeenCalledWith(edit, 'loaded-sha');
    expect(setCatalog).toHaveBeenLastCalledWith(savedCatalog.entries);
    expect(result.current.pendingCatalogKey).toBeNull();
    expect(result.current.catalogEditError).toBeNull();
  });

  it('sets the pending key to the row key while the request is in flight, and ignores a second edit', async () => {
    let resolveUpdate: (value: typeof savedCatalog) => void = () => {};
    updateMonsterMock.mockReturnValue(new Promise((resolve) => (resolveUpdate = resolve)));
    const { result } = await setup();

    act(() => {
      result.current.onCatalogEdit(edit);
    });
    expect(result.current.pendingCatalogKey).toBe(toCatalogEntryKey(edit.name, edit.level));

    act(() => result.current.onCatalogEdit(edit));
    expect(updateMonsterMock).toHaveBeenCalledTimes(1);

    await act(async () => resolveUpdate(savedCatalog));
    expect(result.current.pendingCatalogKey).toBeNull();
  });

  it('on a conflict, applies the newer catalog and says the change was not saved', async () => {
    const newer = { entries: sampleCatalog, sha: 'live-sha' };
    updateMonsterMock.mockRejectedValue(new AddMonsterError('The monster catalog changed since you loaded it.', undefined, newer));
    const { result, setCatalog } = await setup();

    await act(async () => result.current.onCatalogEdit(edit));

    expect(setCatalog).toHaveBeenLastCalledWith(newer.entries);
    expect(result.current.catalogEditError).toBe('The monster catalog changed since you loaded it. Your change was not saved.');
  });

  it('shows a plain server message and keeps the catalog when there is no newer version', async () => {
    updateMonsterMock.mockRejectedValue(new AddMonsterError('Already exists.', 'level'));
    const { result, setCatalog } = await setup();
    setCatalog.mockClear();

    await act(async () => result.current.onCatalogEdit(edit));

    expect(setCatalog).not.toHaveBeenCalled();
    expect(result.current.catalogEditError).toBe('Already exists.');
  });

  it('shows a generic message and logs a non-AddMonsterError', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const failure = new Error('network down');
    updateMonsterMock.mockRejectedValue(failure);
    const { result } = await setup();

    await act(async () => result.current.onCatalogEdit(edit));

    expect(result.current.catalogEditError).toBe('Could not update — see console.');
    expect(consoleError).toHaveBeenCalledWith(failure);
    consoleError.mockRestore();
  });

  it('removes the row with the loaded sha and applies the saved catalog', async () => {
    deleteMonsterMock.mockResolvedValue(savedCatalog);
    const { result, setCatalog } = await setup();

    act(() => result.current.onArmRemove(removal));
    expect(result.current.removeArmedKey).toBe(toCatalogEntryKey(removal.name, removal.level));

    await act(async () => result.current.onCatalogRemove(removal));

    expect(deleteMonsterMock).toHaveBeenCalledWith(removal, 'loaded-sha');
    expect(setCatalog).toHaveBeenLastCalledWith(savedCatalog.entries);
    expect(result.current.removeArmedKey).toBeNull();
    expect(result.current.pendingCatalogKey).toBeNull();
  });

  it('keeps the row and shows the message when a removal is refused', async () => {
    deleteMonsterMock.mockRejectedValue(new AddMonsterError("Lancer is a seed monster and can't be removed."));
    const { result, setCatalog } = await setup();
    setCatalog.mockClear();

    await act(async () => result.current.onCatalogRemove({ name: 'Lancer', level: 1 }));

    expect(setCatalog).not.toHaveBeenCalled();
    expect(result.current.catalogEditError).toBe("Lancer is a seed monster and can't be removed.");
  });

  it('onArmRemove with null clears the armed row', async () => {
    const { result } = await setup();

    act(() => result.current.onArmRemove(removal));
    act(() => result.current.onArmRemove(null));

    expect(result.current.removeArmedKey).toBeNull();
  });
});
