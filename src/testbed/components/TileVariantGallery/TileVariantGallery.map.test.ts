import { CENTRED_TRANSFORM, type TileVariant, type TileVariantsConfig } from '@/modules/map/components/TileVariants/TileVariants.config';
import {
  deleteVariantsInOrder,
  groupVariants,
  isGroupFullySelected,
  pruneSelection,
  toDeleteSummary,
  toggleGroupSelection,
  toggleSelected,
  toTileSample,
  toVariantLabel,
} from './TileVariantGallery.map';
import type { RemoveOutcome, VariantGroup } from './TileVariantGallery.types';

function variant(overrides: Partial<TileVariant> & Pick<TileVariant, 'id' | 'type'>): TileVariant {
  return { name: overrides.id, image: null, transform: { ...CENTRED_TRANSFORM }, color: null, ...overrides };
}

const config: TileVariantsConfig = {
  images: [],
  variants: [
    variant({ id: 'default-base-red', type: 'base', color: 'red' }),
    variant({ id: 'base-blue-a', type: 'base', color: 'blue' }),
    variant({ id: 'base-red-a', type: 'base', color: 'red' }),
    variant({ id: 'base-red-b', type: 'base', color: 'red' }),
    variant({ id: 'default-special', type: 'special' }),
    variant({ id: 'special-x', type: 'special' }),
    variant({ id: 'resource-food-a', type: 'resource-food' }),
  ],
};

function group(key: string): VariantGroup {
  const found = groupVariants(config).find((candidate) => candidate.key === key);
  if (!found) throw new Error(`no group ${key}`);
  return found;
}

describe('groupVariants', () => {
  it('puts base castles first by player colour, then the other types in config order', () => {
    expect(groupVariants(config).map((candidate) => candidate.key)).toEqual([
      'base-blue',
      'base-red',
      'special',
      'resource-food',
    ]);
  });

  it('keeps every variant in exactly one group, so counts add up to the total', () => {
    const grouped = groupVariants(config).flatMap((candidate) => candidate.variants);
    expect(grouped).toHaveLength(config.variants.length);
  });

  it('collects base castles without a known colour into their own group', () => {
    const uncoloured = variant({ id: 'base-none', type: 'base', color: null });
    const keys = groupVariants({ ...config, variants: [uncoloured] }).map((candidate) => candidate.key);
    expect(keys).toEqual(['base-none']);
  });
});

describe('toVariantLabel', () => {
  it('shows the type and, for base castles, the colour', () => {
    expect(toVariantLabel(variant({ id: 'a', type: 'base', color: 'purple' }))).toBe('Base castle · Purple');
    expect(toVariantLabel(variant({ id: 'b', type: 'special' }))).toBe('Special island');
  });
});

describe('selection', () => {
  it('toggles one id on and off without changing the previous set', () => {
    const first = toggleSelected(new Set(), 'base-red-a');
    const second = toggleSelected(first, 'base-red-a');
    expect([...first]).toEqual(['base-red-a']);
    expect(second.size).toBe(0);
  });

  it('selects every deletable variant in a group and never the defaults', () => {
    const next = toggleGroupSelection(new Set(), group('base-red'));
    expect([...next].sort()).toEqual(['base-red-a', 'base-red-b']);
    expect(isGroupFullySelected(next, group('base-red'))).toBe(true);
  });

  it('clears the group when all of its deletable variants are already selected', () => {
    const selected = new Set(['base-red-a', 'base-red-b', 'base-blue-a']);
    const next = toggleGroupSelection(selected, group('base-red'));
    expect([...next]).toEqual(['base-blue-a']);
  });

  it('drops selected ids that are gone or are defaults when the config reloads', () => {
    const pruned = pruneSelection(new Set(['base-red-a', 'gone', 'default-special']), config);
    expect([...pruned]).toEqual(['base-red-a']);
  });
});

describe('toDeleteSummary', () => {
  it('says how many variants will be deleted, singular and plural', () => {
    expect(toDeleteSummary(1)).toContain('Delete 1 tile variant?');
    expect(toDeleteSummary(3)).toContain('Delete 3 tile variants?');
  });
});

describe('deleteVariantsInOrder', () => {
  it('deletes one id at a time, passing each returned sha to the next delete', async () => {
    const calls: Array<[string, string]> = [];
    const remove = async (id: string, sha: string): Promise<RemoveOutcome> => {
      calls.push([id, sha]);
      return { ok: true, sha: `${sha}+1` };
    };

    const run = await deleteVariantsInOrder(['a', 'b'], 's0', remove);

    expect(calls).toEqual([
      ['a', 's0'],
      ['b', 's0+1'],
    ]);
    expect(run).toEqual({ deletedIds: ['a', 'b'], failures: [], sha: 's0+1+1' });
  });

  it('keeps going after a failure and reports it per id', async () => {
    const remove = async (id: string, sha: string): Promise<RemoveOutcome> =>
      id === 'bad' ? { ok: false, message: 'No variant called "bad".', sha } : { ok: true, sha: 'next' };

    const run = await deleteVariantsInOrder(['bad', 'good'], 's0', remove);

    expect(run.deletedIds).toEqual(['good']);
    expect(run.failures).toEqual([{ id: 'bad', message: 'No variant called "bad".' }]);
  });

  it('never sends a default variant to the server', async () => {
    const remove = jest.fn(async (_id: string, sha: string): Promise<RemoveOutcome> => ({ ok: true, sha }));

    const run = await deleteVariantsInOrder(['default-base-red', 'base-red-a'], 's0', remove);

    expect(remove).toHaveBeenCalledTimes(1);
    expect(run.deletedIds).toEqual(['base-red-a']);
  });
});

describe('toTileSample', () => {
  it('draws the base scenario as a base island', () => {
    const sample = toTileSample(variant({ id: 'base-red-a', type: 'base', color: 'red' }));
    expect(sample.isBase).toBe(true);
    expect(sample.island.type).toBe('base');
  });

  it('keeps only the first layout of the scenario the variant type draws', () => {
    const sample = toTileSample(variant({ id: 'resource-food-a', type: 'resource-food' }));
    expect(sample.layouts['resource-2']).toHaveLength(1);
    expect(sample.island.type).toBe('resource');
  });

  it('uses the variant own decoration layouts when it has them', () => {
    const own = { id: 'own', name: 'Own', instances: [] };
    const sample = toTileSample(variant({ id: 'special-x', type: 'special', decorations: { special: [own, own] } }));
    expect(sample.layouts.special).toEqual([own]);
  });
});
