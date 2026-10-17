import type { IconDefaultSource, IconOverride, IconOverridesConfig, IconRegistryEntry } from '@/modules/icons';
import type { IconModuleGroup, IconRowHandlers, IconRowViewModel, IconUploadState } from './IconEditor.types';

const MIN_ROTATION = 0;
const MAX_ROTATION = 359;
const MIN_SIZE = 25;
const MAX_SIZE = 200;

export function clampRotation(value: number): number {
  return Math.min(MAX_ROTATION, Math.max(MIN_ROTATION, value));
}

export function clampSize(value: number): number {
  return Math.min(MAX_SIZE, Math.max(MIN_SIZE, value));
}

export function isOverrideDirty(saved: IconOverride | undefined, draft: IconOverride | undefined): boolean {
  return JSON.stringify(saved ?? {}) !== JSON.stringify(draft ?? {});
}

/** draft?.src present -> an uploaded replacement image; otherwise the registry's own default. */
export function resolveCurrentSource(entry: IconRegistryEntry, draft: IconOverride | undefined): IconDefaultSource {
  if (draft?.src) {
    return { kind: 'image', src: draft.src };
  }

  return entry.defaultSource;
}

export function toIconRowViewModel(
  entry: IconRegistryEntry,
  draft: IconOverride | undefined,
  saved: IconOverride | undefined,
  uploadState: IconUploadState | undefined,
  handlers: IconRowHandlers,
): IconRowViewModel {
  return {
    id: entry.id,
    label: entry.label,
    currentSource: resolveCurrentSource(entry, draft),
    rotation: draft?.rotation ?? entry.defaultRotation,
    size: draft?.size ?? entry.defaultSize,
    hasSavedOverride: saved !== undefined,
    isDirty: isOverrideDirty(saved, draft),
    isUploading: uploadState?.isUploading ?? false,
    uploadError: uploadState?.error ?? null,
    ...handlers,
  };
}

/** Groups by entry.module in first-seen order. */
export function toModuleGroups(
  registry: IconRegistryEntry[],
  draftOverrides: IconOverridesConfig,
  savedOverrides: IconOverridesConfig,
  uploadStates: Record<string, IconUploadState>,
  makeHandlers: (iconId: string) => IconRowHandlers,
): IconModuleGroup[] {
  const groupsByModule = new Map<string, IconModuleGroup>();

  for (const entry of registry) {
    const row = toIconRowViewModel(
      entry,
      draftOverrides[entry.id],
      savedOverrides[entry.id],
      uploadStates[entry.id],
      makeHandlers(entry.id),
    );

    const group = groupsByModule.get(entry.module);
    if (group) {
      group.icons.push(row);
    } else {
      groupsByModule.set(entry.module, { module: entry.module, overriddenCount: 0, icons: [row] });
    }
  }

  return Array.from(groupsByModule.values()).map((group) => ({
    ...group,
    overriddenCount: group.icons.filter((icon) => icon.hasSavedOverride).length,
  }));
}
