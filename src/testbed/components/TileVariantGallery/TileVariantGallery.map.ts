import { PlayerColor } from '@/lib/types';
import type { Island, Monster } from '@/lib/types';
import type { DecorationLayoutsConfig, DecorationScenarioKey } from '@/modules/map/decoration-layouts.types';
import { DECORATION_LAYOUTS_DEFAULT } from '@/modules/map/components/TileDecorations/TileDecorations.map';
import {
  TILE_VARIANT_TYPES,
  toDecorationLayoutsConfig,
  type TileVariant,
  type TileVariantType,
  type TileVariantsConfig,
} from '@/modules/map/components/TileVariants';
import type { DeleteFailure, DeleteRun, RemoveOutcome, VariantGroup } from './TileVariantGallery.types';

const DEFAULT_ID_PREFIX = 'default-';
const BASE_COLOR_ORDER: PlayerColor[] = [PlayerColor.Blue, PlayerColor.Red, PlayerColor.Yellow, PlayerColor.Purple];

const TYPE_LABELS: Record<TileVariantType, string> = {
  base: 'Base castle',
  special: 'Special island',
  monster: 'Monster island',
  empty: 'Empty island',
  'resource-food': 'Food node',
  'resource-wood': 'Wood node',
  'resource-gold': 'Gold node',
};

function capitalise(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function isDefaultVariant(variant: TileVariant): boolean {
  return variant.id.startsWith(DEFAULT_ID_PREFIX);
}

export function isDeletable(variant: TileVariant): boolean {
  return !isDefaultVariant(variant);
}

/** The type and, for base castles, the colour a card shows under its name. */
export function toVariantLabel(variant: TileVariant): string {
  const base = TYPE_LABELS[variant.type];
  return variant.color ? `${base} · ${capitalise(variant.color)}` : base;
}

/**
 * Base castles come first, one section per colour in player order. Every other type follows in the
 * config's type order. Empty sections are dropped, so every variant appears in exactly one group.
 */
export function groupVariants(config: TileVariantsConfig): VariantGroup[] {
  const baseGroups: VariantGroup[] = BASE_COLOR_ORDER.map((color) => ({
    key: `base-${color}`,
    label: `Base · ${capitalise(color)}`,
    variants: config.variants.filter((variant) => variant.type === 'base' && variant.color === color),
  }));
  const otherGroups: VariantGroup[] = TILE_VARIANT_TYPES.filter((type) => type !== 'base').map((type) => ({
    key: type,
    label: TYPE_LABELS[type],
    variants: config.variants.filter((variant) => variant.type === type),
  }));
  const uncolouredBase = config.variants.filter(
    (variant) => variant.type === 'base' && !BASE_COLOR_ORDER.includes(variant.color as PlayerColor),
  );
  const uncolouredGroup: VariantGroup = { key: 'base-none', label: 'Base · No colour', variants: uncolouredBase };

  return [...baseGroups, uncolouredGroup, ...otherGroups].filter((group) => group.variants.length > 0);
}

export function toSelectableIds(variants: TileVariant[]): string[] {
  return variants.filter(isDeletable).map((variant) => variant.id);
}

export function toggleSelected(selected: ReadonlySet<string>, id: string): Set<string> {
  const next = new Set(selected);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  return next;
}

/** Selects every deletable variant in the group, or clears them when they are all selected already. */
export function toggleGroupSelection(selected: ReadonlySet<string>, group: VariantGroup): Set<string> {
  const ids = toSelectableIds(group.variants);
  const allSelected = ids.length > 0 && ids.every((id) => selected.has(id));
  const next = new Set(selected);
  for (const id of ids) {
    if (allSelected) next.delete(id);
    else next.add(id);
  }
  return next;
}

export function isGroupFullySelected(selected: ReadonlySet<string>, group: VariantGroup): boolean {
  const ids = toSelectableIds(group.variants);
  return ids.length > 0 && ids.every((id) => selected.has(id));
}

/** Drops selected ids that no longer exist in the config, or that are defaults and cannot be deleted. */
export function pruneSelection(selected: ReadonlySet<string>, config: TileVariantsConfig): Set<string> {
  const deletable = new Set(toSelectableIds(config.variants));
  return new Set([...selected].filter((id) => deletable.has(id)));
}

export function toDeleteSummary(count: number): string {
  const noun = count === 1 ? 'variant' : 'variants';
  return `Delete ${count} tile ${noun}? This removes ${count === 1 ? 'it' : 'them'} from tile-variants.config.json.`;
}

/**
 * Deletes the ids one after another, each against the sha the previous delete returned, so a change made
 * elsewhere is caught by the server instead of overwritten. Default variants are skipped.
 */
export async function deleteVariantsInOrder(
  ids: string[],
  sha: string,
  remove: (id: string, baseSha: string) => Promise<RemoveOutcome>,
): Promise<DeleteRun> {
  const deletedIds: string[] = [];
  const failures: DeleteFailure[] = [];
  let currentSha = sha;

  for (const id of ids.filter((candidate) => !candidate.startsWith(DEFAULT_ID_PREFIX))) {
    const outcome = await remove(id, currentSha);
    currentSha = outcome.sha;
    if (outcome.ok) deletedIds.push(id);
    else failures.push({ id, message: outcome.message });
  }

  return { deletedIds, failures, sha: currentSha };
}

/** The scenario whose decoration layouts a variant's tile shows, one per variant type. */
const PREVIEW_SCENARIO: Record<TileVariantType, DecorationScenarioKey> = {
  base: 'base',
  special: 'special',
  monster: 'monster-alive',
  empty: 'empty-2',
  'resource-food': 'resource-2',
  'resource-wood': 'resource-2',
  'resource-gold': 'resource-2',
};

const SAMPLE_MONSTER: Monster = { name: 'Lancer', level: 3, sprite: { idle: '', attack: '', death: '' } };

/** A minimal island of the right kind, so TileDecorations resolves the scenario this variant type draws. */
function toSampleIsland(scenario: DecorationScenarioKey): { island: Island; isBase: boolean } {
  const base = { id: `gallery-${scenario}`, x: 0, y: 0, occupants: [] };
  if (scenario === 'base') return { island: { ...base, type: 'base', owner: 0, resources: [] }, isBase: true };
  if (scenario === 'special') return { island: { ...base, type: 'special', resources: [] }, isBase: false };
  if (scenario === 'monster-alive') {
    return { island: { ...base, type: 'monster', monsters: [SAMPLE_MONSTER], resources: [] }, isBase: false };
  }
  if (scenario === 'empty-2') return { island: { ...base, type: 'empty', resources: [] }, isBase: false };
  return { island: { ...base, type: 'resource', resources: [{ type: 'food', amount: 2 }] }, isBase: false };
}

export interface TileSample {
  island: Island;
  isBase: boolean;
  layouts: DecorationLayoutsConfig;
}

/**
 * What a gallery tile draws for a variant: its scenario's first decoration layout, so every card shows one
 * fixed arrangement rather than a seed-picked one. Falls back to the default layout when the variant has none.
 */
export function toTileSample(variant: TileVariant): TileSample {
  const scenario = PREVIEW_SCENARIO[variant.type];
  const merged = toDecorationLayoutsConfig(DECORATION_LAYOUTS_DEFAULT, variant);
  const ownLayouts = merged[scenario].length > 0 ? merged[scenario] : DECORATION_LAYOUTS_DEFAULT[scenario];
  const { island, isBase } = toSampleIsland(scenario);
  return { island, isBase, layouts: { ...merged, [scenario]: ownLayouts.slice(0, 1) } };
}
