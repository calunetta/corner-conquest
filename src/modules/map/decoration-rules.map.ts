// Art rules for island decorations. Pure: no fs or React. The rules are checked against the real configs by
// decoration-rules.map.test.ts, so a new layout that breaks one fails the test. The reasons are in docs/ai/decoration-rules.md.
import type { TileVariantsConfig } from './components/TileVariants/TileVariants.config';
import { isDecorationPositionInBounds } from './decoration-bounds.map';
import type { DecorationLayout, DecorationLayoutsConfig, DecorationScenarioKey } from './decoration-layouts.types';

/** Weapons and tools lying on the floor. Only a monster island may show them, in small numbers. */
const WEAPON = /\/tool-\d+\.png$/;
const SKULL_STICK = /\/skull-spike-\d+\.png$/;
const BONES = /\/bones-\d+\.png$/;
/** Standing structures are not allowed on the special island; only the ruins below are. */
const RUIN = /\/ruin-([a-z0-9-]+)\.png$/;
const STRUCTURE = /\/(black-(archery|barracks|castle|tower|monastery|house-\d)|house-\d+)\.png$/;
const BASE_BUILDING_PICTURE = /\/(blue|red|yellow|purple)-([a-z0-9-]+)\.png$/;
/** Houses are not player-base buildings any more. */
const HOUSE_PICTURE = /\/(blue|red|yellow|purple)-house-\d+\.png$/;

export const MONSTER_KEYS: readonly DecorationScenarioKey[] = ['monster-alive', 'monster-cleared'];
export const MAX_WEAPONS_PER_LAYOUT = 3;
export const MAX_SKULL_STICKS_PER_SPECIAL_LAYOUT = 1;
export const MAX_BONES_PER_SPECIAL_LAYOUT = 3;

/** Images a player base may show as decoration: mushrooms, stones and rocks, bushes and shrubs, plants, gold. */
const BASE_ALLOWED = [/\/0[1-9]\.png$/, /\/(10|11)\.png$/, /\/rock-\d+\.png$/, /\/gold-stone-\d+\.png$/, /\/bush-\d+\.gif$/];

function isBaseAllowed(image: string): boolean {
  return BASE_ALLOWED.some((pattern) => pattern.test(image));
}

/** Size, in % of the tile, of each building as drawn on a player base. Special decorations must match it. */
export function baseBuildingSizes(variants: TileVariantsConfig): Record<string, number> {
  const sizes: Record<string, number> = {};
  for (const variant of variants.variants) {
    const match = variant.type === 'base' && variant.image ? BASE_BUILDING_PICTURE.exec(variant.image) : null;
    if (match) sizes[match[2]] = variant.transform.size;
  }
  return sizes;
}

function checkLayout(
  layout: DecorationLayout,
  key: DecorationScenarioKey,
  buildingSizes: Record<string, number>,
  where: string,
): string[] {
  const problems: string[] = [];
  const isMonster = MONSTER_KEYS.includes(key);
  const weapons = layout.instances.filter((instance) => WEAPON.test(instance.image));
  const skullSticks = layout.instances.filter((instance) => SKULL_STICK.test(instance.image));
  const bones = layout.instances.filter((instance) => BONES.test(instance.image));

  for (const instance of layout.instances) {
    if (!isDecorationPositionInBounds(instance)) problems.push(`${where}: ${instance.id} is outside top 3-85 / left 8-85`);
  }
  if (!isMonster && weapons.length > 0) problems.push(`${where}: weapons may only lie on a monster island`);
  if (isMonster && weapons.length > MAX_WEAPONS_PER_LAYOUT) {
    problems.push(`${where}: at most ${MAX_WEAPONS_PER_LAYOUT} weapons, found ${weapons.length}`);
  }
  if (key === 'special') {
    if (weapons.length > 0) problems.push(`${where}: no weapons on the special island`);
    if (skullSticks.length > MAX_SKULL_STICKS_PER_SPECIAL_LAYOUT) problems.push(`${where}: at most one skull stick`);
    if (bones.length > MAX_BONES_PER_SPECIAL_LAYOUT) problems.push(`${where}: at most ${MAX_BONES_PER_SPECIAL_LAYOUT} bones`);
    for (const instance of layout.instances) {
      if (STRUCTURE.test(instance.image) && !RUIN.test(instance.image)) {
        problems.push(`${where}: ${instance.id} is a standing structure; only ruins are allowed on the special island`);
      }
      const ruin = RUIN.exec(instance.image);
      if (ruin && buildingSizes[ruin[1]] !== undefined && instance.size !== buildingSizes[ruin[1]]) {
        problems.push(`${where}: ${instance.id} is ${instance.size}% but the player base ${ruin[1]} is ${buildingSizes[ruin[1]]}%`);
      }
    }
  }
  return problems;
}

/** Every rule violation in the decoration layouts and variant layouts. An empty list means the art follows the rules. */
export function findDecorationRuleViolations(
  defaults: DecorationLayoutsConfig,
  variants: TileVariantsConfig,
): string[] {
  const buildingSizes = baseBuildingSizes(variants);
  const problems: string[] = [];
  for (const key of Object.keys(defaults) as DecorationScenarioKey[]) {
    for (const layout of defaults[key]) problems.push(...checkLayout(layout, key, buildingSizes, `default ${key}/${layout.id}`));
  }
  for (const variant of variants.variants) {
    if (variant.type === 'base' && variant.image && HOUSE_PICTURE.test(variant.image)) {
      problems.push(`variant ${variant.id}: houses are not a player-base building`);
    }
    if (!variant.decorations) continue;
    for (const key of Object.keys(variant.decorations) as DecorationScenarioKey[]) {
      for (const layout of variant.decorations[key] ?? []) {
        problems.push(...checkLayout(layout, key, buildingSizes, `variant ${variant.id}/${layout.id}`));
        if (variant.type === 'base') {
          for (const instance of layout.instances) {
            if (!isBaseAllowed(instance.image)) problems.push(`variant ${variant.id}/${layout.id}: ${instance.image} is not a player-base decoration`);
          }
        }
      }
    }
  }
  return problems;
}
