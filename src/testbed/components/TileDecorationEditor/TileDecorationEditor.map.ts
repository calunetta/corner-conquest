import type { CSSProperties } from 'react';
import type { DecorationInstance, DecorationLayout, DecorationLayoutsConfig, DecorationScenarioKey } from '@/modules/map';
import type { EditorScenarioOption } from './TileDecorationEditor.types';
import { SPRITE_CENTER_TRANSFORM } from './TileDecorationEditor.styles';
import { toFileName } from './TileDecorationEditor.display.map';
import type { TileVariantType, TileVariantsConfig } from '@/modules/map/components/TileVariants/TileVariants.config';

/** Deep-clones the statically-imported config so editing never mutates the shared JSON module. */
export function cloneDecorationLayoutsConfig(config: DecorationLayoutsConfig): DecorationLayoutsConfig {
  return JSON.parse(JSON.stringify(config)) as DecorationLayoutsConfig;
}

/** The art-variant types a decoration scenario edits: resource scenarios cover every resource type. */
export function toArtVariantTypes(outerKey: string): TileVariantType[] {
  if (outerKey === 'resource') return ['resource-food', 'resource-wood', 'resource-gold'];
  return [outerKey as TileVariantType];
}

/** The dropdown entries for a scenario: the default (built-in decorations) first, then that scenario's variants. */
export function toArtOptions(outerKey: string, config: TileVariantsConfig): { id: string; label: string }[] {
  const types = toArtVariantTypes(outerKey);
  const variants = config.variants.filter((variant) => types.includes(variant.type));
  return [
    { id: DEFAULT_ART_ID, label: 'Default' },
    ...variants.map((variant) => ({ id: variant.id, label: `${variant.name || 'Untitled'}${variant.color ? ` · ${variant.color}` : ''}` })),
  ];
}

export const DEFAULT_ART_ID = 'default';

export function toScenarioKey(outerKey: string, variant: DecorationScenarioKey | null): DecorationScenarioKey {
  return (variant ?? outerKey) as DecorationScenarioKey;
}

export function firstVariantKey(outerKey: string, options: EditorScenarioOption[]): DecorationScenarioKey | null {
  const option = options.find((candidate) => candidate.key === outerKey);
  return option && option.variants.length > 0 ? option.variants[0].key : null;
}

const MIN_PERCENT = 0;
const MAX_PERCENT = 100;
const DEFAULT_INSTANCE_TOP = 45;
const DEFAULT_INSTANCE_LEFT = 45;
const DEFAULT_INSTANCE_SIZE = 25;
const DEFAULT_INSTANCE_Z = 12;

/** Clamps a drag/nudge/resize percentage to the canvas box, 0-100 on each axis. */
export function clampPercent(value: number): number {
  return Math.min(MAX_PERCENT, Math.max(MIN_PERCENT, value));
}

/** Converts a pointer's client position within the canvas's bounding box into a clamped
 *  center-point percentage, for the view's pointer-move drag handler. */
export function toPointerPercent(clientPos: number, boundingStart: number, boundingSize: number): number {
  if (boundingSize <= 0) return MIN_PERCENT;
  return clampPercent(((clientPos - boundingStart) / boundingSize) * MAX_PERCENT);
}

/** Centre of a dragged item, in percent of the canvas, given where the pointer is and where it grabbed
 *  the item. Keeping the grab offset stops the item from jumping its centre under the pointer. */
export function toGrabbedCenterPercent(
  pointerPos: number,
  grabOffsetPx: number,
  boundingStart: number,
  boundingSize: number,
): number {
  return toPointerPercent(pointerPos - grabOffsetPx, boundingStart, boundingSize);
}

/** A newly-added decoration: centered on the canvas, the spec's loose mid-range default
 *  (inside the span the migrated tables already use: 15-28% size, z 10-20). */
export function createInstance(id: string, image: string): DecorationInstance {
  return {
    id,
    image,
    top: DEFAULT_INSTANCE_TOP,
    left: DEFAULT_INSTANCE_LEFT,
    size: DEFAULT_INSTANCE_SIZE,
    z: DEFAULT_INSTANCE_Z,
  };
}

/** Keyboard equivalent of drag: moves by dTop/dLeft (signed, e.g. +/-1 or +/-5), clamped. */
export function nudgeInstance(instance: DecorationInstance, dTop: number, dLeft: number): DecorationInstance {
  return { ...instance, top: clampPercent(instance.top + dTop), left: clampPercent(instance.left + dLeft) };
}

/** The decorations-mode sprite's fully-computed inline style: today's inline style, moved here
 *  so TileDecorationEditorSprite stays format-agnostic (the generalized component takes a
 *  pre-computed style instead of a DecorationInstance). */
export function toDecorationSpriteStyle(instance: DecorationInstance): CSSProperties {
  return {
    top: `${instance.top}%`,
    left: `${instance.left}%`,
    width: `${instance.size}%`,
    height: `${instance.size}%`,
    zIndex: instance.z,
    transform: SPRITE_CENTER_TRANSFORM,
  };
}

export function toDecorationAriaLabel(instance: DecorationInstance, index: number, count: number): string {
  return `Decoration ${index + 1} of ${count}, ${toFileName(instance.image)}`;
}

export function renameLayout(layout: DecorationLayout, name: string): DecorationLayout {
  return { ...layout, name };
}

/** Copies a layout's instances into a new layout: a new layout id AND new instance ids, so
 *  editing the copy never mutates the original. `instanceIds` must match `layout.instances`'s
 *  length and order. */
export function duplicateLayout(
  layout: DecorationLayout,
  newLayoutId: string,
  instanceIds: string[],
): DecorationLayout {
  return {
    id: newLayoutId,
    name: `${layout.name} copy`,
    instances: layout.instances.map((instance, index) => ({ ...instance, id: instanceIds[index] })),
  };
}

export function removeInstance(layout: DecorationLayout, instanceId: string): DecorationLayout {
  return { ...layout, instances: layout.instances.filter((instance) => instance.id !== instanceId) };
}

export function removeLayout(layouts: DecorationLayout[], layoutId: string): DecorationLayout[] {
  return layouts.filter((layout) => layout.id !== layoutId);
}

/** The 5 outer scenario options and their sub-picker variants, in the fixed order the editor's
 *  Select controls use. Base/Special have no sub-picker (variants: []); their outer `key` is
 *  itself a valid DecorationScenarioKey. Labels match ui-design.md's Final spec Copy verbatim. */
export function toScenarioOptions(): EditorScenarioOption[] {
  return [
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
  ];
}
