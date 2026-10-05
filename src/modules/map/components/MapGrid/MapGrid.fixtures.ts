import type { Island } from '@/lib/types';
import { IslandType, PlayerColor, ResourceType } from '@/lib/types';
import type { MapGridViewModel } from './MapGrid.types';
import { buildPlayer } from '../../board-context.fixtures';

const localPlayer = buildPlayer({ id: 0, playerId: 'p0', color: PlayerColor.Blue });

const emptyIsland: Island = {
  id: '0-0',
  x: 0,
  y: 0,
  type: IslandType.Empty,
  resources: [],
  occupants: [],
  positionedBy: [],
};

const baseIsland: Island = {
  id: '1-1',
  x: 1,
  y: 1,
  type: IslandType.Base,
  owner: localPlayer.id,
  resources: [],
  occupants: [],
  positionedBy: [],
};

const resourceIsland: Island = {
  id: '2-2',
  x: 2,
  y: 2,
  type: IslandType.Resource,
  resources: [{ type: ResourceType.Food, amount: 3 }],
  occupants: [{ playerId: 0, armyId: 0 }],
  positionedBy: [],
};

const noop = (): void => undefined;

// Use jest.fn() in test environments, plain noop functions otherwise (for preview/SSR)
const createMockFn = typeof jest !== 'undefined' ? jest.fn : () => noop;

export const populatedMapGrid: MapGridViewModel = {
  map: [emptyIsland, baseIsland, resourceIsland],
  cols: 3,
  rows: 3,
  isMobile: false,
  zoom: 0.85,
  pan: { x: 0, y: 0 },
  defaultZoom: 0.85,
  zoomIn: createMockFn(),
  zoomOut: createMockFn(),
  resetZoom: createMockFn(),
  handlers: {
    onMouseDown: createMockFn(),
    onMouseMove: createMockFn(),
    onMouseUp: createMockFn(),
    onMouseLeave: createMockFn(),
    onWheel: createMockFn(),
    onTouchStart: createMockFn(),
    onTouchMove: createMockFn(),
    onTouchEnd: createMockFn(),
  },
};
