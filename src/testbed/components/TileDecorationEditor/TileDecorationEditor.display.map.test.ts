import { IslandType } from '@/lib/types';
import { toFileName, toReferenceIsland } from './TileDecorationEditor.display.map';
import type { DecorationScenarioKey } from '@/modules/map';

function totalResourceAmount(scenarioKey: DecorationScenarioKey): number {
  return toReferenceIsland(scenarioKey).resources.reduce((sum, resource) => sum + resource.amount, 0);
}

describe('toReferenceIsland', () => {
  it.each([
    ['base', IslandType.Base],
    ['special', IslandType.Special],
    ['empty-2', IslandType.Empty],
    ['empty-3', IslandType.Empty],
    ['resource-1', IslandType.Resource],
    ['resource-4', IslandType.Resource],
    ['monster-alive', IslandType.Monster],
    ['monster-cleared', IslandType.Monster],
  ] as const)('returns a %s reference tile of island type %s', (scenarioKey, islandType) => {
    expect(toReferenceIsland(scenarioKey).type).toBe(islandType);
  });

  it.each([
    [1, 'resource-1'],
    [2, 'resource-2'],
    [3, 'resource-3'],
    [4, 'resource-4'],
  ] as const)('gives a resource tile exactly %d node(s) of resources', (nodeCount, scenarioKey) => {
    expect(totalResourceAmount(scenarioKey)).toBe(nodeCount);
  });

  it('gives the monster-alive tile a living monster', () => {
    expect(toReferenceIsland('monster-alive').monsters).toHaveLength(1);
  });

  it('gives the monster-cleared tile no monsters, so it reads as cleared', () => {
    expect(toReferenceIsland('monster-cleared').monsters).toEqual([]);
  });

  it('gives Empty tiles occupant corners so the reference matches a real board', () => {
    expect(toReferenceIsland('empty-2').occupants).toHaveLength(4);
  });

  it('gives Base tiles an owner, and leaves Special tiles unowned', () => {
    expect(toReferenceIsland('base').owner).toBeDefined();
    expect(toReferenceIsland('special').owner).toBeUndefined();
  });
});

describe('toFileName', () => {
  it('returns the last path segment of a public image path', () => {
    expect(toFileName('/sprites/decorations/pine_tree.gif')).toBe('pine_tree.gif');
  });

  it('returns the input unchanged when it has no directory separator', () => {
    expect(toFileName('tree.gif')).toBe('tree.gif');
  });
});
