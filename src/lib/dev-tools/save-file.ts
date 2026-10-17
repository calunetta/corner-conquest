import { mkdir, readdir, readFile, rm, writeFile } from 'fs/promises';
import path from 'path';
import {
  commitRepoChanges,
  githubConfigFromEnv,
  gitBlobSha,
  listRepoDirectory,
  readRepoFile,
  type CommitRepoResult,
  type DevToolChange,
} from './github-repo';

export { gitBlobSha } from './github-repo';
export type { DevToolChange } from './github-repo';

/**
 * Where dev-tool saves go. `local` (the default, for `next dev`) edits the working tree.
 * `github` commits to the live branch and opens a pull request, so a deployed site never edits its own files.
 */
export function isGitHubTarget(): boolean {
  return process.env.DEV_TOOLS_SAVE_TARGET === 'github';
}

function requireGitHubConfig() {
  const config = githubConfigFromEnv();
  if (!config) throw new Error('Live saves need GITHUB_TOKEN and GITHUB_REPO on the server.');
  return config;
}

/**
 * Applies a set of file changes as one save. In `local` mode the changes are written (or deleted) immediately;
 * `baseSha` checks are skipped because the working tree is the only copy. In `github` mode see commitRepoChanges.
 */
export async function saveDevToolFiles(input: { changes: DevToolChange[]; message: string }): Promise<CommitRepoResult> {
  if (isGitHubTarget()) return commitRepoChanges(requireGitHubConfig(), input);

  for (const change of input.changes) {
    const target = path.join(process.cwd(), change.path);
    if (change.content === null) {
      await rm(target, { force: true });
      continue;
    }
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, change.content);
  }
  return { status: 'saved', commitSha: '', pullRequest: { number: 0, url: '' }, mainChanged: false };
}

/** One dev-tool file as the editor should see it, with the sha a later save sends back as `baseSha`. */
export async function readDevToolFile(filePath: string): Promise<{ content: string; sha: string }> {
  if (!isGitHubTarget()) {
    const content = await readFile(path.join(process.cwd(), filePath), 'utf8');
    return { content, sha: gitBlobSha(content) };
  }

  const config = requireGitHubConfig();
  const file =
    (await readRepoFile(config, filePath, config.liveBranch)) ??
    (await readRepoFile(config, filePath, config.baseBranch));
  if (!file) throw new Error(`${filePath} is not in the repository.`);
  return file;
}

/** File names in a folder, as the deployed or local copy sees them. Empty when the folder is missing. */
export async function listDevToolDirectory(dir: string): Promise<string[]> {
  if (!isGitHubTarget()) {
    return readdir(path.join(process.cwd(), dir)).catch(() => []);
  }

  const config = requireGitHubConfig();
  const live = await listRepoDirectory(config, dir, config.liveBranch);
  return live.length > 0 ? live : listRepoDirectory(config, dir, config.baseBranch);
}

/** Reads a file's bytes: the working tree locally, the live branch in github mode (or base if absent there). */
export async function readDevToolBytes(filePath: string): Promise<Buffer> {
  if (!isGitHubTarget()) return readFile(path.join(process.cwd(), filePath));

  const config = requireGitHubConfig();
  const file =
    (await readRepoFile(config, filePath, config.liveBranch)) ??
    (await readRepoFile(config, filePath, config.baseBranch));
  if (!file) throw new Error(`${filePath} is not in the repository.`);
  return file.bytes;
}
