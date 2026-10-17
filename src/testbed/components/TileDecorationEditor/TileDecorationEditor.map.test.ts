import {
  clampPercent,
  createInstance,
  duplicateLayout,
  nudgeInstance,
  removeInstance,
  removeLayout,
  renameLayout,
  toDecorationAriaLabel,
  toDecorationSpriteStyle,
  toGrabbedCenterPercent,
  toPointerPercent,
  toScenarioOptions,
  toDraggedInstancePercent,
  toResizedSize,
} from './TileDecorationEditor.map';
import type { DecorationInstance, DecorationLayout } from '@/modules/map';

describe('clampPercent', () => {
  it.each([
    [-10, 0],
    [0, 0],
    [50, 50],
    [100, 100],
    [110, 100],
  ])('clamps %d to %d', (input, expected) => {
    expect(clampPercent(input)).toBe(expected);
  });
});

describe('toPointerPercent', () => {
  it('converts a pointer position within the bounding box to a percentage', () => {
    expect(toPointerPercent(50, 0, 200)).toBe(25);
  });

  it('clamps a pointer position before the bounding box start to 0', () => {
    expect(toPointerPercent(-50, 0, 200)).toBe(0);
  });

  it('clamps a pointer position past the bounding box end to 100', () => {
    expect(toPointerPercent(250, 0, 200)).toBe(100);
  });

  it('returns 0 for a zero-size bounding box instead of dividing by zero', () => {
    expect(toPointerPercent(50, 0, 0)).toBe(0);
  });

  it('returns 0 for a negative bounding size', () => {
    expect(toPointerPercent(50, 0, -10)).toBe(0);
  });
});

describe('createInstance', () => {
  it('returns the spec default fields for a new instance', () => {
    expect(createInstance('instance-1', '/sprites/decorations/tree.gif')).toEqual({
      id: 'instance-1',
      image: '/sprites/decorations/tree.gif',
      top: 45,
      left: 45,
      size: 25,
      z: 12,
    });
  });
});

describe('nudgeInstance', () => {
  const baseInstance: DecorationInstance = { id: 'i-1', image: 'img.gif', top: 50, left: 50, size: 20, z: 10 };

  it.each([
    [1, 1, 51, 51],
    [-1, -1, 49, 49],
    [5, 5, 55, 55],
    [-5, -5, 45, 45],
  ])('moves by dTop=%d dLeft=%d to top=%d left=%d', (dTop, dLeft, expectedTop, expectedLeft) => {
    expect(nudgeInstance(baseInstance, dTop, dLeft)).toEqual({ ...baseInstance, top: expectedTop, left: expectedLeft });
  });

  it('clamps at the top=3 / left=8 lower edge', () => {
    const edgeInstance: DecorationInstance = { ...baseInstance, top: 4, left: 9 };
    expect(nudgeInstance(edgeInstance, -5, -5)).toEqual({ ...edgeInstance, top: 3, left: 8 });
  });

  it('clamps at the top=85 / left=85 upper edge', () => {
    const edgeInstance: DecorationInstance = { ...baseInstance, top: 83, left: 83 };
    expect(nudgeInstance(edgeInstance, 5, 5)).toEqual({ ...edgeInstance, top: 85, left: 85 });
  });

  it('does not mutate the input instance', () => {
    const original = { ...baseInstance };
    nudgeInstance(baseInstance, 1, 1);
    expect(baseInstance).toEqual(original);
  });
});

describe('toDecorationSpriteStyle', () => {
  const instance: DecorationInstance = { id: 'i-1', image: 'img.gif', top: 36.5, left: 44.5, size: 15, z: 10 };

  it('converts the instance fields into a fully-computed inline style, percent/zIndex/transform', () => {
    expect(toDecorationSpriteStyle(instance)).toEqual({
      top: '36.5%',
      left: '44.5%',
      width: '15%',
      height: '15%',
      zIndex: 10,
      transform: 'translate(-50%, -50%)',
    });
  });

  it('does not mutate the input instance', () => {
    const original = { ...instance };
    toDecorationSpriteStyle(instance);
    expect(instance).toEqual(original);
  });
});

describe('toDecorationAriaLabel', () => {
  it('includes the 1-based position, total count, and the image file name', () => {
    const instance: DecorationInstance = {
      id: 'i-1',
      image: '/sprites/decorations/pine_tree.gif',
      top: 10,
      left: 10,
      size: 15,
      z: 10,
    };
    expect(toDecorationAriaLabel(instance, 0, 2)).toBe('Decoration 1 of 2, pine_tree.gif');
  });

  it('uses the index to compute the 1-based position, not always 1', () => {
    const instance: DecorationInstance = { id: 'i-2', image: 'tree.gif', top: 10, left: 10, size: 15, z: 10 };
    expect(toDecorationAriaLabel(instance, 2, 3)).toBe('Decoration 3 of 3, tree.gif');
  });
});

describe('renameLayout', () => {
  it('returns a new layout with the updated name, other fields unchanged', () => {
    const layout: DecorationLayout = { id: 'l-1', name: 'Default', instances: [] };
    expect(renameLayout(layout, 'Renamed')).toEqual({ id: 'l-1', name: 'Renamed', instances: [] });
  });

  it('does not mutate the input layout', () => {
    const layout: DecorationLayout = { id: 'l-1', name: 'Default', instances: [] };
    const original = { ...layout };
    renameLayout(layout, 'Renamed');
    expect(layout).toEqual(original);
  });
});

describe('duplicateLayout', () => {
  const original: DecorationLayout = {
    id: 'l-1',
    name: 'Default',
    instances: [
      { id: 'l-1-instance-0', image: 'a.gif', top: 10, left: 10, size: 15, z: 10 },
      { id: 'l-1-instance-1', image: 'b.gif', top: 20, left: 20, size: 15, z: 10 },
    ],
  };

  it('assigns a new layout id and a " copy" suffixed name', () => {
    const copy = duplicateLayout(original, 'l-2', ['l-2-instance-0', 'l-2-instance-1']);
    expect(copy.id).toBe('l-2');
    expect(copy.name).toBe('Default copy');
  });

  it('assigns new instance ids, preserving every other instance field and order', () => {
    const copy = duplicateLayout(original, 'l-2', ['l-2-instance-0', 'l-2-instance-1']);
    expect(copy.instances).toEqual([
      { id: 'l-2-instance-0', image: 'a.gif', top: 10, left: 10, size: 15, z: 10 },
      { id: 'l-2-instance-1', image: 'b.gif', top: 20, left: 20, size: 15, z: 10 },
    ]);
  });

  it('does not mutate the original layout or its instances', () => {
    const originalCopyForComparison = JSON.parse(JSON.stringify(original)) as DecorationLayout;
    duplicateLayout(original, 'l-2', ['l-2-instance-0', 'l-2-instance-1']);
    expect(original).toEqual(originalCopyForComparison);
  });

  it('editing the duplicate does not affect the original (distinct instance identity)', () => {
    const copy = duplicateLayout(original, 'l-2', ['l-2-instance-0', 'l-2-instance-1']);
    copy.instances[0].top = 99;
    expect(original.instances[0].top).toBe(10);
  });
});

describe('removeInstance', () => {
  const layout: DecorationLayout = {
    id: 'l-1',
    name: 'Default',
    instances: [
      { id: 'i-1', image: 'a.gif', top: 10, left: 10, size: 15, z: 10 },
      { id: 'i-2', image: 'b.gif', top: 20, left: 20, size: 15, z: 10 },
    ],
  };

  it('removes only the matching instance', () => {
    const result = removeInstance(layout, 'i-1');
    expect(result.instances).toEqual([{ id: 'i-2', image: 'b.gif', top: 20, left: 20, size: 15, z: 10 }]);
  });

  it('is a no-op (returns an equal layout) when the instance id is not found', () => {
    const result = removeInstance(layout, 'missing');
    expect(result.instances).toEqual(layout.instances);
  });

  it('can remove the last instance, leaving an empty array', () => {
    const singleInstanceLayout: DecorationLayout = {
      id: 'l-2',
      name: 'Default',
      instances: [{ id: 'i-1', image: 'a.gif', top: 10, left: 10, size: 15, z: 10 }],
    };
    expect(removeInstance(singleInstanceLayout, 'i-1').instances).toEqual([]);
  });

  it('does not mutate the input layout', () => {
    const original = JSON.parse(JSON.stringify(layout)) as DecorationLayout;
    removeInstance(layout, 'i-1');
    expect(layout).toEqual(original);
  });
});

describe('removeLayout', () => {
  const layouts: DecorationLayout[] = [
    { id: 'l-1', name: 'Default', instances: [] },
    { id: 'l-2', name: 'Alt', instances: [] },
  ];

  it('removes only the matching layout', () => {
    expect(removeLayout(layouts, 'l-1')).toEqual([{ id: 'l-2', name: 'Alt', instances: [] }]);
  });

  it('is a no-op (returns an equal array) when the layout id is not found', () => {
    expect(removeLayout(layouts, 'missing')).toEqual(layouts);
  });

  it('does not mutate the input array', () => {
    const original = [...layouts];
    removeLayout(layouts, 'l-1');
    expect(layouts).toEqual(original);
  });
});

describe('toScenarioOptions', () => {
  it('returns exactly 5 outer options summing to 10 scenario/variant combinations', () => {
    const options = toScenarioOptions();
    expect(options).toHaveLength(5);
    const variantCount = options.reduce((sum, option) => sum + Math.max(option.variants.length, 1), 0);
    expect(variantCount).toBe(10);
  });

  it('matches ui-design.md Copy verbatim', () => {
    expect(toScenarioOptions()).toEqual([
      { key: 'base', label: 'Base', variants: [] },
      { key: 'special', label: 'Special', variants: [] },
      {
        key: 'empty',
        label: 'Empty',
        variants: [
          { key: 'empty-2', label: '2 trees' },
          { key: 'empty-3', label: '3 trees' },
        ],
      },
      {
        key: 'resource',
        label: 'Resource',
        variants: [
          { key: 'resource-1', label: '1 node' },
          { key: 'resource-2', label: '2 nodes' },
          { key: 'resource-3', label: '3 nodes' },
          { key: 'resource-4', label: '4 nodes' },
        ],
      },
      {
        key: 'monster',
        label: 'Monster',
        variants: [
          { key: 'monster-alive', label: 'Alive' },
          { key: 'monster-cleared', label: 'Cleared' },
        ],
      },
    ]);
  });
});

describe('toGrabbedCenterPercent', () => {
  it('keeps the centre the same distance from the pointer as it was at grab time', () => {
    // Canvas 200px wide from x=100; pointer at 180 with the grab 10px left of the centre -> centre at 190px -> 45%.
    expect(toGrabbedCenterPercent(180, -10, 100, 200)).toBeCloseTo(45);
  });

  it('matches the plain pointer position when the grab was at the centre', () => {
    expect(toGrabbedCenterPercent(180, 0, 100, 200)).toBeCloseTo(toPointerPercent(180, 100, 200));
  });
});

describe('toDraggedInstancePercent', () => {
  const start = { top: 40, left: 30, pointerX: 100, pointerY: 100 };
  const box = { width: 200, height: 400 };

  it('moves by the pointer travel as a share of the canvas', () => {
    expect(toDraggedInstancePercent(start, { x: 120, y: 140 }, box)).toEqual({ top: 50, left: 40 });
  });

  it('keeps the position when the pointer has not moved', () => {
    expect(toDraggedInstancePercent(start, { x: 100, y: 100 }, box)).toEqual({ top: 40, left: 30 });
  });

  it('clamps to the canvas', () => {
    expect(toDraggedInstancePercent(start, { x: -1000, y: 1000 }, box)).toEqual({ top: 100, left: 0 });
  });
});

describe('toResizedSize', () => {
  it('grows so the corner follows the pointer: 20px of travel on a 200px canvas grows the size by 20%', () => {
    expect(toResizedSize(20, 20, 20, 200)).toBe(40);
  });

  it('shrinks but never below the minimum', () => {
    expect(toResizedSize(20, -1000, -1000, 200)).toBe(2);
  });

  it('caps at the full canvas', () => {
    expect(toResizedSize(90, 1000, 1000, 200)).toBe(100);
  });
});
