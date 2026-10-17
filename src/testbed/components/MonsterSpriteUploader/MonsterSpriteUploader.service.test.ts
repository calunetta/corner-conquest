import { AddMonsterError, addMonster } from './MonsterSpriteUploader.service';

const entry = { name: 'Fire Ogre', level: 2, isBoss: false, sprite: { idle: '/monster/fire-ogre-lvl2-idle.gif' } };

function mockFetch(response: Partial<Response> & { json?: () => Promise<unknown> }) {
  const fetchMock = jest.fn().mockResolvedValue(response);
  global.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
}

const idleFile = new File(['GIF89a'], 'idle.gif', { type: 'image/gif' });

describe('addMonster', () => {
  it('posts the form fields to /api/monster-catalog and returns the written entry', async () => {
    const fetchMock = mockFetch({ ok: true, status: 200, json: async () => ({ entry }) });

    const result = await addMonster({ name: 'Fire Ogre', level: 2, isBoss: false, idleFile, attackFile: null });

    expect(result).toEqual(entry);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/monster-catalog');
    expect(init.method).toBe('POST');
    const body = init.body as FormData;
    expect(body.get('name')).toBe('Fire Ogre');
    expect(body.get('level')).toBe('2');
    expect(body.get('isBoss')).toBe('false');
    expect(body.get('idle')).toBe(idleFile);
    expect(body.has('attack')).toBe(false);
  });

  it('throws AddMonsterError carrying the server message and field on a non-ok response', async () => {
    mockFetch({
      ok: false,
      status: 409,
      json: async () => ({ error: 'A monster named "Fire Ogre" at level 2 already exists.', field: 'name' }),
    });

    const error = await addMonster({ name: 'Fire Ogre', level: 2, isBoss: false, idleFile, attackFile: null }).catch(
      (caught: unknown) => caught,
    );

    expect(error).toBeInstanceOf(AddMonsterError);
    expect((error as AddMonsterError).message).toBe('A monster named "Fire Ogre" at level 2 already exists.');
    expect((error as AddMonsterError).field).toBe('name');
  });

  it('falls back to a status message when the error body is not JSON', async () => {
    mockFetch({
      ok: false,
      status: 500,
      json: async () => {
        throw new SyntaxError('Unexpected token');
      },
    });

    const error = await addMonster({ name: 'Fire Ogre', level: 2, isBoss: false, idleFile, attackFile: null }).catch(
      (caught: unknown) => caught,
    );

    expect(error).toBeInstanceOf(AddMonsterError);
    expect((error as AddMonsterError).message).toBe('Failed to add monster: 500');
    expect((error as AddMonsterError).field).toBeUndefined();
  });
});
