import tileVariantsConfig from './components/TileVariants/tile-variants.config.json';
import type { TileVariantsConfig } from './components/TileVariants/TileVariants.config';
import decorationLayoutsConfig from './decoration-layouts.config.json';
import type { DecorationLayoutsConfig } from './decoration-layouts.types';
import { findDecorationRuleViolations } from './decoration-rules.map';

const defaults = decorationLayoutsConfig as DecorationLayoutsConfig;
const variants = tileVariantsConfig as TileVariantsConfig;

function layoutWith(key: keyof DecorationLayoutsConfig, instances: { image: string; size?: number }[]): DecorationLayoutsConfig {
  const base = Object.fromEntries(
    (Object.keys(defaults) as (keyof DecorationLayoutsConfig)[]).map((scenario) => [scenario, [{ id: 'empty', name: 'Empty', instances: [] }]]),
  ) as unknown as DecorationLayoutsConfig;
  base[key] = [
    {
      id: 'probe',
      name: 'Probe',
      instances: instances.map((instance, index) => ({
        id: `probe-${index}`,
        image: instance.image,
        top: 40,
        left: 40,
        size: instance.size ?? 10,
        z: 10,
      })),
    },
  ];
  return base;
}

const noVariants: TileVariantsConfig = { images: [], variants: [] };

describe('findDecorationRuleViolations on the shipped configs', () => {
  it('reports no violations', () => {
    expect(findDecorationRuleViolations(defaults, variants)).toEqual([]);
  });
});

describe('weapon rule', () => {
  it('rejects a weapon on a non-monster island', () => {
    const problems = findDecorationRuleViolations(layoutWith('base', [{ image: '/sprites/decorations/tool-1.png' }]), noVariants);
    expect(problems.join('\n')).toMatch(/weapons may only lie on a monster island/);
  });

  it('allows up to three weapons on a cleared monster island and rejects a fourth', () => {
    const three = [1, 2, 3].map(() => ({ image: '/sprites/decorations/tool-1.png' }));
    const four = [1, 2, 3, 4].map(() => ({ image: '/sprites/decorations/tool-1.png' }));

    expect(findDecorationRuleViolations(layoutWith('monster-cleared', three), noVariants)).toEqual([]);
    expect(findDecorationRuleViolations(layoutWith('monster-cleared', four), noVariants).join('\n')).toMatch(/at most 3 weapons/);
  });
});

describe('special island rules', () => {
  it('allows one skull stick and up to three bones, and rejects more skull sticks', () => {
    const ok = [{ image: '/sprites/decorations/skull-spike-1.png' }, { image: '/sprites/decorations/bones-1.png' }];
    const twoSticks = [{ image: '/sprites/decorations/skull-spike-1.png' }, { image: '/sprites/decorations/skull-spike-2.png' }];

    expect(findDecorationRuleViolations(layoutWith('special', ok), noVariants)).toEqual([]);
    expect(findDecorationRuleViolations(layoutWith('special', twoSticks), noVariants).join('\n')).toMatch(/one skull stick/);
  });

  it('rejects a standing black building on the special island', () => {
    expect(findDecorationRuleViolations(layoutWith('special', [{ image: '/sprites/decorations/black-castle.png', size: 60 }]), noVariants).join('\n')).toMatch(
      /standing structure/,
    );
  });

  it('rejects a ruin whose size differs from the player base building', () => {
    const withBase: TileVariantsConfig = {
      images: [],
      variants: [
        { id: 'b', type: 'base', name: 'Castle', image: '/sprites/tile-variants/generated/base/blue-castle.png', transform: { x: 50, y: 50, size: 60 }, color: 'blue' },
      ],
    };

    expect(findDecorationRuleViolations(layoutWith('special', [{ image: '/sprites/decorations/ruin-castle.png', size: 60 }]), withBase)).toEqual([]);
    expect(
      findDecorationRuleViolations(layoutWith('special', [{ image: '/sprites/decorations/ruin-castle.png', size: 40 }]), withBase).join('\n'),
    ).toMatch(/player base castle is 60%/);
  });
});

describe('player base rule', () => {
  it('rejects a tree in a base variant', () => {
    const base: TileVariantsConfig = {
      images: [],
      variants: [
        {
          id: 'base-blue-x',
          type: 'base',
          name: 'X',
          image: '/sprites/tile-variants/generated/base/blue-house-1.png',
          transform: { x: 50, y: 50, size: 42 },
          color: 'blue',
          decorations: { base: [{ id: 'l', name: 'L', instances: [{ id: 'i', image: '/sprites/decorations/tree-1.gif', top: 40, left: 40, size: 10, z: 10 }] }] },
        },
      ],
    };

    expect(findDecorationRuleViolations(defaults, base).join('\n')).toMatch(/not a player-base decoration/);
  });
});

describe('position rule', () => {
  it('rejects a decoration outside the bounds', () => {
    const problems = findDecorationRuleViolations(layoutWith('special', [{ image: '/sprites/decorations/bones-1.png' }]), noVariants);
    expect(problems).toEqual([]);
    const outside = layoutWith('special', [{ image: '/sprites/decorations/bones-1.png' }]);
    outside.special[0].instances[0].top = 2;
    expect(findDecorationRuleViolations(outside, noVariants).join('\n')).toMatch(/outside top 3-85/);
  });
});
