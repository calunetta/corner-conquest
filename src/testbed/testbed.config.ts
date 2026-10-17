import type { ComponentPreview } from './testbed.types';

/**
 * Component previews are a development tool: always on in `next dev`, never served by a production build.
 */
export function isTestbedEnabled(): boolean {
  return process.env.NODE_ENV !== 'production';
}

/**
 * Dev tools (the editors that write to the repo or the server) are the only previews a deployed site shows.
 * They still need the dev-tools token; see `src/lib/dev-tools/access.ts`.
 */
export function isPreviewVisible(preview: ComponentPreview | undefined): boolean {
  return isTestbedEnabled() || preview?.devTool === true;
}
