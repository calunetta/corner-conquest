import { commitRepoChanges, type GitHubRepoConfig } from './github-repo';
import { gitBlobSha } from './github-repo';

const config: GitHubRepoConfig = {
  token: 'test-token',
  repo: 'acme/game',
  baseBranch: 'main',
  liveBranch: 'dev-tools/live-edits',
};
const PATH = 'src/config.json';
const b64 = (text: string) => Buffer.from(text, 'utf8').toString('base64');

interface FakeState {
  liveFile: string | null;
  baseFile: string | null;
  openPulls: Array<{ number: number; html_url: string }>;
}

/** Answers the GitHub endpoints commitRepoChanges calls, and records every write. */
function fakeGitHub(state: FakeState) {
  const writes: Array<{ method: string; path: string; body?: Record<string, unknown> }> = [];
  const json = (status: number, data: unknown) => ({ status, json: async () => data });
  const fileReply = (text: string | null) =>
    text === null ? json(404, {}) : json(200, { sha: gitBlobSha(text), content: b64(text), encoding: 'base64' });

  global.fetch = jest.fn(async (url: string, init: { method: string; body?: string }) => {
    const body = init.body ? (JSON.parse(init.body) as Record<string, unknown>) : undefined;
    const path = url.replace('https://api.github.com/repos/acme/game/', '');
    if (init.method !== 'GET') writes.push({ method: init.method, path, body });

    if (path === `git/ref/heads/${config.liveBranch}`) return json(200, { object: { sha: 'live-head' } });
    if (path === 'git/commits/live-head') return json(200, { tree: { sha: 'live-tree' } });
    if (path === `git/ref/heads/${config.baseBranch}`) return json(200, { object: { sha: 'base-head' } });
    if (path.startsWith(`contents/${PATH}?ref=dev-tools`)) return fileReply(state.liveFile);
    if (path.startsWith(`contents/${PATH}?ref=main`)) return fileReply(state.baseFile);
    if (path === 'git/blobs') return json(201, { sha: 'blob-1' });
    if (path === 'git/trees') return json(201, { sha: 'tree-1' });
    if (path === 'git/commits') return json(201, { sha: 'commit-1' });
    if (path === `git/refs/heads/${config.liveBranch}`) return json(200, {});
    if (path.startsWith('pulls?state=open')) return json(200, state.openPulls);
    if (path === 'pulls') {
      const created = { number: 7, html_url: 'https://github.com/acme/game/pull/7' };
      state.openPulls.push(created);
      return json(201, created);
    }
    throw new Error(`unexpected request ${init.method} ${path}`);
  }) as unknown as typeof fetch;

  return { writes };
}

const original = '{"a":1}\n';

describe('commitRepoChanges', () => {
  let state: FakeState;

  beforeEach(() => {
    state = { liveFile: original, baseFile: original, openPulls: [] };
  });

  it('commits the changed file on the live branch and opens a pull request', async () => {
    const { writes } = fakeGitHub(state);

    const result = await commitRepoChanges(config, {
      changes: [{ path: PATH, content: '{"a":2}\n', baseSha: gitBlobSha(original) }],
      message: 'chore: edit',
    });

    expect(result).toEqual({
      status: 'saved',
      commitSha: 'commit-1',
      pullRequest: { number: 7, url: 'https://github.com/acme/game/pull/7' },
      mainChanged: false,
    });
    expect(writes.map((write) => write.path)).toEqual([
      'git/blobs',
      'git/trees',
      'git/commits',
      `git/refs/heads/${config.liveBranch}`,
      'pulls',
    ]);
    expect(writes.find((write) => write.path === 'git/trees')?.body).toEqual({
      base_tree: 'live-tree',
      tree: [{ path: PATH, mode: '100644', type: 'blob', sha: 'blob-1' }],
    });
    expect(writes.find((write) => write.path === 'git/commits')?.body).toMatchObject({
      message: 'chore: edit',
      parents: ['live-head'],
    });
  });

  it('writes nothing and returns every conflicting file when the live copy has moved on', async () => {
    state.liveFile = '{"a":9}\n';
    const { writes } = fakeGitHub(state);

    const result = await commitRepoChanges(config, {
      changes: [{ path: PATH, content: '{"a":2}\n', baseSha: gitBlobSha(original) }],
      message: 'chore: edit',
    });

    expect(result).toEqual({
      status: 'conflict',
      conflicts: [{ path: PATH, currentSha: gitBlobSha('{"a":9}\n'), currentContent: '{"a":9}\n' }],
    });
    expect(writes).toHaveLength(0);
  });

  it('reports mainChanged when main moved on after the editor loaded the file', async () => {
    state.baseFile = '{"a":5}\n';
    fakeGitHub(state);

    const result = await commitRepoChanges(config, {
      changes: [{ path: PATH, content: '{"a":2}\n', baseSha: gitBlobSha(original) }],
      message: 'chore: edit',
    });

    expect(result.status === 'saved' && result.mainChanged).toBe(true);
  });

  it('writes nothing when the content is already on the live branch', async () => {
    const { writes } = fakeGitHub(state);

    const result = await commitRepoChanges(config, {
      changes: [{ path: PATH, content: original, baseSha: gitBlobSha(original) }],
      message: 'chore: edit',
    });

    expect(result).toEqual({ status: 'unchanged' });
    expect(writes).toHaveLength(0);
  });

  it('records a deletion as a null tree entry', async () => {
    const { writes } = fakeGitHub(state);

    await commitRepoChanges(config, {
      changes: [{ path: PATH, content: null, baseSha: gitBlobSha(original) }],
      message: 'chore: remove',
    });

    expect(writes.find((write) => write.path === 'git/trees')?.body).toEqual({
      base_tree: 'live-tree',
      tree: [{ path: PATH, mode: '100644', type: 'blob', sha: null }],
    });
  });

  it('reuses the open pull request instead of opening a second one', async () => {
    state.openPulls = [{ number: 3, html_url: 'https://github.com/acme/game/pull/3' }];
    const { writes } = fakeGitHub(state);

    const result = await commitRepoChanges(config, {
      changes: [{ path: PATH, content: '{"a":2}\n', baseSha: gitBlobSha(original) }],
      message: 'chore: edit',
    });

    expect(result.status === 'saved' && result.pullRequest.number).toBe(3);
    expect(writes.some((write) => write.path === 'pulls')).toBe(false);
  });
});

describe('gitBlobSha', () => {
  it('matches what git computes for the same text', () => {
    // `printf 'hello\n' | git hash-object --stdin`
    expect(gitBlobSha('hello\n')).toBe('ce013625030ba8dba906f756967f9e9ca394464a');
  });
});
