import { ResourceType } from './cards';
import { Monster } from './monsters';

export const IslandType = {
  Base: 'base',
  Resource: 'resource',
  Monster: 'monster',
  Special: 'special',
  Empty: 'empty',
} as const;
export type IslandType = (typeof IslandType)[keyof typeof IslandType];

export type IslandResource = {
  type: ResourceType;
  amount: number;
};

export type PlayerPosition = {
  x: number;
  y: number;
  resource: ResourceType;
  armyId: number;
};

export type Island = {
  id: string;
  x: number;
  y: number;
  type: IslandType;
  owner?: number;
  resources: IslandResource[];
  occupants: { playerId: number; armyId: number }[];
  monsters?: Monster[];
  positionedBy?: { playerId: number; resource: ResourceType }[];
};

export type BaseTileInfo = {
  owner: number;
  x: number;
  y: number;
};
