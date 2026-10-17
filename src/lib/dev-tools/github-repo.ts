import { createHash } from 'crypto';

const GITHUB_API = 'https://api.github.com';

/** Where live dev-tool saves go: one long-lived branch, with one open pull request into the base branch. */
export interface GitHubRepoConfig {
  token: string;
  /** `owner/name`. */
  repo: string;
  baseBranch: string;
  liveBranch: string;
}

export interface RepoFile {
  sha: string;
  content: string;
  bytes: Buffer;
}

export interface PullRequestRef {
  number: number;
  url: string;
}

/** One file in a save. `content: null` deletes it. `baseSha` is the blob sha the editor loaded (null = expected absent). */
export interface DevToolChange {
  path: string;
  content: string | Uint8Array | null;
  baseSha?: string | null;
}

export type CommitRepoResult =
  | { status: 'saved'; commitSha: string; pullRequest: PullRequestRef; mainChanged: boolean }
  | { status: 'unchanged' }
  | { status: 'conflict'; conflicts: Array<{ path: string; currentSha: string | null; currentContent: string | null }> };

/** Reads the GitHub settings from the environment. Null when the live-save target is not configured. */
export function githubConfigFromEnv(env: NodeJS.ProcessEnv = process.env): GitHubRepoConfig | null {
  const token = env.GITHUB_TOKEN;
  const repo = env.GITHUB_REPO;
  if (!token || !repo) return null;

  return {
    token,
    repo,
    baseBranch: env.DEV_TOOLS_BASE_BRANCH || 'main',
    liveBranch: env.DEV_TOOLS_LIVE_BRANCH || 'dev-tools/live-edits',
  };
}

interface ApiResult {
  status: number;
  data: unknown;
}

async function callGitHub(
  config: GitHubRepoConfig,
  endpoint: string,
  init: { method?: string; body?: unknown } = {},
): Promise<ApiResult> {
  const response = await fetch(`${GITHUB_API}/repos/${config.repo}/${endpoint}`, {
    method: init.method ?? 'GET',
    headers: {
      Authorization: `Bearer ${config.token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
    },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
  const data: unknown = response.status === 204 ? null : await response.json().catch(() => null);
  return { status: response.status, data };
}

function expectOk(result: ApiResult, what: string): unknown {
  if (result.status >= 200 && result.status < 300) return result.data;
  throw new Error(`GitHub ${what} failed with ${result.status}.`);
}

function toBytes(content: string | Uint8Array): Buffer {
  return typeof content === 'string' ? Buffer.from(content, 'utf8') : Buffer.from(content);
}

/** The git blob sha of some bytes, so a sha computed here matches the one GitHub reports for the same file. */
export function gitBlobSha(content: string | Uint8Array): string {
  const bytes = toBytes(content);
  return createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
}

/** The file's blob sha and text on a branch, or null when it does not exist there. Text only. */
export async function readRepoFile(config: GitHubRepoConfig, path: string, ref: string): Promise<RepoFile | null> {
  const result = await callGitHub(config, `contents/${path}?ref=${encodeURIComponent(ref)}`);
  if (result.status === 404) return null;

  const data = expectOk(result, `read ${path}`) as { sha: string; content?: string; encoding?: string };
  // The contents API leaves `content` out for files over 1 MB; the blob endpoint still returns them.
  const base64 = data.content && data.encoding !== "none" ? data.content : await readBlob(config, data.sha);
  const bytes = Buffer.from(base64.replace(/\n/g, ''), 'base64');
  return { sha: data.sha, content: bytes.toString('utf8'), bytes };
}

async function readBlob(config: GitHubRepoConfig, sha: string): Promise<string> {
  const blob = expectOk(await callGitHub(config, `git/blobs/${sha}`), `read blob ${sha}`) as { content: string };
  return blob.content;
}

/** File names directly inside a folder on a branch. Empty when the folder does not exist. */
export async function listRepoDirectory(config: GitHubRepoConfig, dir: string, ref: string): Promise<string[]> {
  const result = await callGitHub(config, `contents/${dir}?ref=${encodeURIComponent(ref)}`);
  if (result.status === 404) return [];

  const entries = expectOk(result, `list ${dir}`) as Array<{ name: string; type: string }>;
  return entries.filter((entry) => entry.type === 'file').map((entry) => entry.name);
}

/** Creates the live branch from the base branch's head, if it does not exist yet. */
async function ensureLiveBranch(config: GitHubRepoConfig): Promise<string> {
  const existing = await callGitHub(config, `git/ref/heads/${config.liveBranch}`);
  if (existing.status === 200) return (existing.data as { object: { sha: string } }).object.sha;

  const base = expectOk(await callGitHub(config, `git/ref/heads/${config.baseBranch}`), 'read base branch') as {
    object: { sha: string };
  };
  expectOk(
    await callGitHub(config, 'git/refs', {
      method: 'POST',
      body: { ref: `refs/heads/${config.liveBranch}`, sha: base.object.sha },
    }),
    'create live branch',
  );
  return base.object.sha;
}

/** Returns the open pull request from the live branch into the base branch, opening one if needed. */
async function ensurePullRequest(config: GitHubRepoConfig): Promise<PullRequestRef> {
  const owner = config.repo.split('/')[0];
  const open = expectOk(
    await callGitHub(
      config,
      `pulls?state=open&head=${encodeURIComponent(`${owner}:${config.liveBranch}`)}&base=${config.baseBranch}`,
    ),
    'list pull requests',
  ) as Array<{ number: number; html_url: string }>;
  if (open.length > 0) return { number: open[0].number, url: open[0].html_url };

  const created = expectOk(
    await callGitHub(config, 'pulls', {
      method: 'POST',
      body: {
        title: 'Dev tools: live edits',
        head: config.liveBranch,
        base: config.baseBranch,
        body: 'Saved from the dev tools on the deployed site. Review the diff and merge to publish.',
      },
    }),
    'open pull request',
  ) as { number: number; html_url: string };
  return { number: created.number, url: created.html_url };
}

/** The live branch's head commit and that commit's tree. */
async function readHead(config: GitHubRepoConfig, headSha: string): Promise<{ commitSha: string; treeSha: string }> {
  const commit = expectOk(await callGitHub(config, `git/commits/${headSha}`), 'read commit') as {
    tree: { sha: string };
  };
  return { commitSha: headSha, treeSha: commit.tree.sha };
}

/**
 * Saves several files as one commit on the live branch, then makes sure a pull request into the base branch is open.
 * Each change that has a `baseSha` is checked first: if the live branch's copy differs, nothing is written and every
 * conflicting file is returned with its current content, so the editor can show both versions.
 */
export async function commitRepoChanges(
  config: GitHubRepoConfig,
  input: { changes: DevToolChange[]; message: string },
): Promise<CommitRepoResult> {
  const headSha = await ensureLiveBranch(config);

  const current = new Map<string, RepoFile | null>();
  for (const change of input.changes) {
    current.set(change.path, await readRepoFile(config, change.path, config.liveBranch));
  }

  const conflicts = input.changes
    .filter((change) => change.baseSha !== undefined && (current.get(change.path)?.sha ?? null) !== change.baseSha)
    .map((change) => {
      const file = current.get(change.path);
      return { path: change.path, currentSha: file?.sha ?? null, currentContent: file?.content ?? null };
    });
  if (conflicts.length > 0) return { status: 'conflict', conflicts };

  const changed = input.changes.filter((change) => {
    const file = current.get(change.path);
    if (change.content === null) return file !== null && file !== undefined;
    return gitBlobSha(change.content) !== (file?.sha ?? null);
  });
  if (changed.length === 0) return { status: 'unchanged' };

  const head = await readHead(config, headSha);
  const tree: Array<{ path: string; mode: '100644'; type: 'blob'; sha: string | null }> = [];
  for (const change of changed) {
    if (change.content === null) {
      tree.push({ path: change.path, mode: '100644', type: 'blob', sha: null });
      continue;
    }
    const blob = expectOk(
      await callGitHub(config, 'git/blobs', {
        method: 'POST',
        body: { content: toBytes(change.content).toString('base64'), encoding: 'base64' },
      }),
      `upload ${change.path}`,
    ) as { sha: string };
    tree.push({ path: change.path, mode: '100644', type: 'blob', sha: blob.sha });
  }

  const newTree = expectOk(
    await callGitHub(config, 'git/trees', { method: 'POST', body: { base_tree: head.treeSha, tree } }),
    'create tree',
  ) as { sha: string };
  const commit = expectOk(
    await callGitHub(config, 'git/commits', {
      method: 'POST',
      body: { message: input.message, tree: newTree.sha, parents: [head.commitSha] },
    }),
    'create commit',
  ) as { sha: string };
  expectOk(
    await callGitHub(config, `git/refs/heads/${config.liveBranch}`, {
      method: 'PATCH',
      body: { sha: commit.sha, force: false },
    }),
    'move live branch',
  );

  const mainChanged = await anyBaseChanged(config, input.changes);
  return { status: 'saved', commitSha: commit.sha, pullRequest: await ensurePullRequest(config), mainChanged };
}

/** True when the base branch's copy of a file moved on after the editor loaded it. */
async function anyBaseChanged(config: GitHubRepoConfig, changes: DevToolChange[]): Promise<boolean> {
  for (const change of changes) {
    if (change.baseSha === undefined) continue;
    const base = await readRepoFile(config, change.path, config.baseBranch);
    if ((base?.sha ?? null) !== change.baseSha) return true;
  }
  return false;
}
