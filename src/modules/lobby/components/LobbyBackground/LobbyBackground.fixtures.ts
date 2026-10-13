import type { CloudViewModel } from './LobbyBackground.types';

/** Shared by the tests and the testbed preview. Deterministic: no random values or dates. */
export const SAMPLE_CLOUDS: CloudViewModel[] = [
  { id: 'sample-cloud-1', left: 8, top: 12, durationSeconds: 22, scale: 0.8, sprite: '/sprites/cloud_small.png' },
  { id: 'sample-cloud-2', left: 38, top: 6, durationSeconds: 26, scale: 0.65, sprite: '/sprites/cloud_medium.png' },
  { id: 'sample-cloud-3', left: 64, top: 22, durationSeconds: 19, scale: 1, sprite: '/sprites/cloud_big.png' },
  { id: 'sample-cloud-4', left: 82, top: 38, durationSeconds: 24, scale: 0.7, sprite: '/sprites/cloud_medium.png' },
];
