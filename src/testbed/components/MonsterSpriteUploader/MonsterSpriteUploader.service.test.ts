import { AddMonsterError, addMonster, deleteMonster, updateMonster } from './MonsterSpriteUploader.service';

const entry = { name: 'Fire Ogre', level: 2, isBoss: false, sprite: { idle: '/monster/fire-ogre-lvl2-idle.gif' } };
const saved = { entry, entries: [entry], sha: 'next-sha', pullRequestUrl: null };

function mockFetch(response: Partial<Response> & { json?: () => Promise<unknown> }) {
  const fetchMock = jest.fn().mockResolvedValue(response);
  global.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
}

const idleFile = new File(['GIF89a'], 'idle.gif', { type: 'image/gif' });

describe('addMonster', () => {
  it('posts the form fields and the catalog sha to /api/monster-catalog and returns the saved catalog', async () => {
    const fetchMock = mockFetch({ ok: true, status: 200, json: async () => saved });

    const result = await addMonster({ name: 'Fire Ogre', level: 2, isBoss: false, idleFile, attackFile: null }, 'old-sha');

    expect(result).toEqual(saved);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/monster-catalog');
    expect(init.method).toBe('POST');
    const body = init.body as FormData;
    expect(body.get('name')).toBe('Fire Ogre');
    expect(body.get('level')).toBe('2');
    expect(body.get('isBoss')).toBe('false');
    expect(body.get('idle')).toBe(idleFile);
    expect(body.get('baseSha')).toBe('old-sha');
    expect(body.has('attack')).toBe(false);
  });

  it('throws AddMonsterError carrying the server message and field on a non-ok response', async () => {
    mockFetch({
      ok: false,
      status: 400,
      json: async () => ({ error: 'A monster named "Fire Ogre" at level 2 already exists.', field: 'name' }),
    });

    const error = await addMonster({ name: 'Fire Ogre', level: 2, isBoss: false, idleFile, attackFile: null }, 'sha').catch(
      (caught: unknown) => caught,
    );

    expect(error).toBeInstanceOf(AddMonsterError);
    expect((error as AddMonsterError).message).toBe('A monster named "Fire Ogre" at level 2 already exists.');
    expect((error as AddMonsterError).field).toBe('name');
  });

  it('carries the newer catalog on a 409 conflict', async () => {
    mockFetch({
      ok: false,
      status: 409,
      json: async () => ({ error: 'The monster catalog changed since you loaded it.', entries: [entry], sha: 'live-sha' }),
    });

    const error = await addMonster({ name: 'Fire Ogre', level: 2, isBoss: false, idleFile, attackFile: null }, 'stale').catch(
      (caught: unknown) => caught,
    );

    expect((error as AddMonsterError).newer).toEqual({ entries: [entry], sha: 'live-sha' });
  });

  it('falls back to a status message when the error body is not JSON', async () => {
    mockFetch({
      ok: false,
      status: 500,
      json: async () => {
        throw new SyntaxError('Unexpected token');
      },
    });

    const error = await addMonster({ name: 'Fire Ogre', level: 2, isBoss: false, idleFile, attackFile: null }, 'sha').catch(
      (caught: unknown) => caught,
    );

    expect(error).toBeInstanceOf(AddMonsterError);
    expect((error as AddMonsterError).message).toBe('Failed to change the monster catalog: 500');
    expect((error as AddMonsterError).field).toBeUndefined();
  });
});

describe('updateMonster', () => {
  const edit = { name: 'Fire Ogre', level: 2, nextLevel: 3, nextIsBoss: true } as const;

  it('PATCHes the edit and the catalog sha as JSON and returns the saved catalog', async () => {
    const fetchMock = mockFetch({ ok: true, status: 200, json: async () => saved });

    const result = await updateMonster(edit, 'old-sha');

    expect(result).toEqual(saved);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/monster-catalog');
    expect(init.method).toBe('PATCH');
    expect(init.headers).toEqual({ 'Content-Type': 'application/json' });
    expect(JSON.parse(init.body as string)).toEqual({ ...edit, baseSha: 'old-sha' });
  });

  it('throws AddMonsterError carrying the server message and field on a non-ok response', async () => {
    mockFetch({
      ok: false,
      status: 409,
      json: async () => ({ error: 'A monster named "Fire Ogre" at level 3 already exists.', field: 'level' }),
    });

    const error = await updateMonster(edit, 'sha').catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(AddMonsterError);
    expect((error as AddMonsterError).message).toBe('A monster named "Fire Ogre" at level 3 already exists.');
    expect((error as AddMonsterError).field).toBe('level');
  });
});

describe('deleteMonster', () => {
  const removal = { name: 'Fire Ogre', level: 2 } as const;

  it('DELETEs the name, level and catalog sha as JSON and returns the saved catalog', async () => {
    const fetchMock = mockFetch({ ok: true, status: 200, json: async () => saved });

    await expect(deleteMonster(removal, 'old-sha')).resolves.toEqual(saved);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/monster-catalog');
    expect(init.method).toBe('DELETE');
    expect(init.headers).toEqual({ 'Content-Type': 'application/json' });
    expect(JSON.parse(init.body as string)).toEqual({ name: 'Fire Ogre', level: 2, baseSha: 'old-sha' });
  });

  it('throws AddMonsterError carrying the server message on a non-ok response', async () => {
    mockFetch({
      ok: false,
      status: 403,
      json: async () => ({ error: "Lancer is a seed monster and can't be removed." }),
    });

    const error = await deleteMonster({ name: 'Lancer', level: 1 }, 'sha').catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(AddMonsterError);
    expect((error as AddMonsterError).message).toBe("Lancer is a seed monster and can't be removed.");
  });
});
