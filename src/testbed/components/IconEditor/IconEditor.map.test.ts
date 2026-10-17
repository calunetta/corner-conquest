import type { IconOverridesConfig, IconRegistryEntry } from '@/modules/icons';
import type { IconRowHandlers, IconUploadState } from './IconEditor.types';
import {
  clampRotation,
  clampSize,
  isOverrideDirty,
  resolveCurrentSource,
  toIconRowViewModel,
  toModuleGroups,
} from './IconEditor.map';
import { sampleIconRegistry } from './IconEditor.fixtures';

const lucideEntry: IconRegistryEntry = {
  id: 'swords',
  label: 'Swords',
  module: 'combat',
  defaultSource: { kind: 'lucide', name: 'Swords' },
  defaultRotation: 0,
  defaultSize: 100,
};

const imageEntry: IconRegistryEntry = {
  id: 'icon-fight',
  label: 'Icon Fight',
  module: 'hud',
  defaultSource: { kind: 'image', src: '/sprites/icon_fight.png' },
  defaultRotation: 0,
  defaultSize: 100,
};

// Two modules, four icons. combat is first-seen (its first icon is first), so it must come first
// in the output even though a hud icon sits between its two combat icons.
const groupingRegistry: IconRegistryEntry[] = [
  { ...lucideEntry, id: 'a', label: 'A', module: 'combat' },
  { ...lucideEntry, id: 'b', label: 'B', module: 'hud' },
  { ...lucideEntry, id: 'c', label: 'C', module: 'combat' },
  { ...lucideEntry, id: 'd', label: 'D', module: 'hud' },
];

const noHandlers: IconRowHandlers = {
  onRotationChange: () => {},
  onSizeChange: () => {},
  onUpload: () => {},
  onReset: () => {},
};

describe('clampRotation', () => {
  it.each([
    [-1, 0],
    [-360, 0],
    [0, 0],
    [1, 1],
    [90, 90],
    [358, 358],
    [359, 359],
    [360, 359],
    [720, 359],
  ])('clamps %p to %p', (input, expected) => {
    expect(clampRotation(input)).toBe(expected);
  });
});

describe('clampSize', () => {
  it.each([
    [-50, 25],
    [0, 25],
    [24, 25],
    [25, 25],
    [26, 26],
    [100, 100],
    [199, 199],
    [200, 200],
    [201, 200],
    [1000, 200],
  ])('clamps %p to %p', (input, expected) => {
    expect(clampSize(input)).toBe(expected);
  });
});

describe('isOverrideDirty', () => {
  it('is false when neither side has an override', () => {
    expect(isOverrideDirty(undefined, undefined)).toBe(false);
  });

  it('is false when both sides are equal objects', () => {
    expect(isOverrideDirty({ rotation: 45, size: 150 }, { rotation: 45, size: 150 })).toBe(false);
  });

  it('is false for an empty override against no override', () => {
    expect(isOverrideDirty(undefined, {})).toBe(false);
    expect(isOverrideDirty({}, undefined)).toBe(false);
  });

  it.each([
    ['rotation changed', { rotation: 45 }, { rotation: 90 }],
    ['size changed', { size: 100 }, { size: 150 }],
    ['src added', {}, { src: '/sprites/icon-overrides/a-1.png' }],
    ['src changed', { src: '/sprites/icon-overrides/a-1.png' }, { src: '/sprites/icon-overrides/a-2.png' }],
    ['rotation added to a saved size-only override', { size: 150 }, { size: 150, rotation: 10 }],
    ['saved override removed', { rotation: 45 }, undefined],
    ['draft override added', undefined, { rotation: 45 }],
  ])('is true when %s', (_label, saved, draft) => {
    expect(isOverrideDirty(saved, draft)).toBe(true);
  });
});

describe('resolveCurrentSource', () => {
  it('returns the registry default when there is no draft', () => {
    expect(resolveCurrentSource(lucideEntry, undefined)).toBe(lucideEntry.defaultSource);
  });

  it('returns the registry default when the draft has only rotation or size', () => {
    expect(resolveCurrentSource(imageEntry, { rotation: 90, size: 120 })).toBe(imageEntry.defaultSource);
  });

  it('returns the uploaded image when the draft has a src', () => {
    expect(resolveCurrentSource(lucideEntry, { src: '/sprites/icon-overrides/swords-1.png' })).toEqual({
      kind: 'image',
      src: '/sprites/icon-overrides/swords-1.png',
    });
  });

  it('treats an empty src as no upload and returns the registry default', () => {
    expect(resolveCurrentSource(lucideEntry, { src: '' })).toBe(lucideEntry.defaultSource);
  });
});

describe('toIconRowViewModel', () => {
  it('shows the registry defaults and no badges for an icon with no override', () => {
    const row = toIconRowViewModel(lucideEntry, undefined, undefined, undefined, noHandlers);

    expect(row).toMatchObject({
      id: 'swords',
      label: 'Swords',
      currentSource: lucideEntry.defaultSource,
      rotation: 0,
      size: 100,
      hasSavedOverride: false,
      isDirty: false,
      isUploading: false,
      uploadError: null,
    });
  });

  it('reads rotation and size from the draft, and reports a saved override as hasSavedOverride', () => {
    const draft = { rotation: 45, size: 150 };
    const saved = { rotation: 45, size: 150 };

    const row = toIconRowViewModel(lucideEntry, draft, saved, undefined, noHandlers);

    expect(row.rotation).toBe(45);
    expect(row.size).toBe(150);
    expect(row.hasSavedOverride).toBe(true);
    expect(row.isDirty).toBe(false);
  });

  it('marks the row dirty when the draft differs from the saved override', () => {
    const row = toIconRowViewModel(lucideEntry, { rotation: 90 }, { rotation: 45 }, undefined, noHandlers);

    expect(row.isDirty).toBe(true);
    expect(row.hasSavedOverride).toBe(true);
    expect(row.rotation).toBe(90);
  });

  it('passes upload state through, and reports isUploading and uploadError as false/null when there is none', () => {
    const uploading: IconUploadState = { isUploading: true, error: null };
    const failed: IconUploadState = { isUploading: false, error: 'Failed to upload icon image: 500' };

    expect(toIconRowViewModel(lucideEntry, undefined, undefined, uploading, noHandlers)).toMatchObject({
      isUploading: true,
      uploadError: null,
    });
    expect(toIconRowViewModel(lucideEntry, undefined, undefined, failed, noHandlers)).toMatchObject({
      isUploading: false,
      uploadError: 'Failed to upload icon image: 500',
    });
  });

  it('spreads the handlers onto the row unchanged', () => {
    const handlers: IconRowHandlers = {
      onRotationChange: jest.fn(),
      onSizeChange: jest.fn(),
      onUpload: jest.fn(),
      onReset: jest.fn(),
    };

    const row = toIconRowViewModel(lucideEntry, undefined, undefined, undefined, handlers);
    row.onRotationChange(10);
    row.onReset();

    expect(row.onRotationChange).toBe(handlers.onRotationChange);
    expect(handlers.onRotationChange).toHaveBeenCalledWith(10);
    expect(handlers.onReset).toHaveBeenCalledTimes(1);
  });
});

describe('toModuleGroups', () => {
  it('returns no groups for an empty registry', () => {
    expect(toModuleGroups([], {}, {}, {}, () => noHandlers)).toEqual([]);
  });

  it('groups by module in first-seen order, keeping each icon in registry order within its group', () => {
    const groups = toModuleGroups(groupingRegistry, {}, {}, {}, () => noHandlers);

    expect(groups.map((group) => group.module)).toEqual(['combat', 'hud']);
    expect(groups[0].icons.map((icon) => icon.id)).toEqual(['a', 'c']);
    expect(groups[1].icons.map((icon) => icon.id)).toEqual(['b', 'd']);
  });

  it('groups the live sample registry into its three modules in first-seen order', () => {
    const groups = toModuleGroups(sampleIconRegistry, {}, {}, {}, () => noHandlers);

    expect(groups.map((group) => group.module)).toEqual(['combat', 'hud', 'map']);
    expect(groups.map((group) => group.icons.length)).toEqual([1, 2, 1]);
  });

  it('counts an icon as overridden only when it has a saved override', () => {
    const saved: IconOverridesConfig = { a: { rotation: 90 } };
    const draft: IconOverridesConfig = { a: { rotation: 90 }, c: { size: 150 } };

    const groups = toModuleGroups(groupingRegistry, draft, saved, {}, () => noHandlers);

    expect(groups[0].overriddenCount).toBe(1);
    expect(groups[1].overriddenCount).toBe(0);
  });

  it.each([
    ['none of the group', {}, { combat: 0, hud: 0 }],
    ['one of the group', { a: { rotation: 90 } }, { combat: 1, hud: 0 }],
    ['all of the group', { b: { rotation: 90 }, d: { size: 150 } }, { combat: 0, hud: 2 }],
  ])('overriddenCount is correct when %s icons are saved', (_label, saved, expectedCounts) => {
    const groups = toModuleGroups(groupingRegistry, {}, saved, {}, () => noHandlers);

    const counts = Object.fromEntries(groups.map((group) => [group.module, group.overriddenCount]));
    expect(counts).toEqual(expectedCounts);
  });

  it('counts saved overrides even when the draft has removed them (reset)', () => {
    const saved: IconOverridesConfig = { a: { rotation: 90 } };

    const groups = toModuleGroups(groupingRegistry, {}, saved, {}, () => noHandlers);

    expect(groups[0].overriddenCount).toBe(1);
    expect(groups[0].icons[0]).toMatchObject({ hasSavedOverride: true, isDirty: true });
  });

  it('builds one set of handlers per icon, keyed by that icon id', () => {
    const makeHandlers = jest.fn((iconId: string): IconRowHandlers => ({ ...noHandlers, onReset: () => iconId }));

    const groups = toModuleGroups(groupingRegistry, {}, {}, {}, makeHandlers);

    expect(makeHandlers.mock.calls.map(([iconId]) => iconId)).toEqual(['a', 'b', 'c', 'd']);
    // Icon 'c' sits second in the combat group; its row must carry c's handler, not a's.
    expect(groups[0].icons.map((icon) => icon.id)).toEqual(['a', 'c']);
    expect(groups[0].icons[1].onReset()).toBe('c');
  });

  it('reads each icon\'s draft, saved and upload state by its own id', () => {
    const groups = toModuleGroups(
      groupingRegistry,
      { b: { rotation: 270 } },
      {},
      { d: { isUploading: true, error: null } },
      () => noHandlers,
    );

    const hud = groups[1].icons;
    expect(hud.find((icon) => icon.id === 'b')).toMatchObject({ rotation: 270, isDirty: true, isUploading: false });
    expect(hud.find((icon) => icon.id === 'd')).toMatchObject({ rotation: 0, isUploading: true });
  });

  it('does not mutate its inputs', () => {
    // JSON copy, not structuredClone: jsdom (this project's test environment) does not provide it.
    const copy = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
    const registry = copy(groupingRegistry);
    const draft: IconOverridesConfig = { a: { rotation: 90 } };
    const saved: IconOverridesConfig = { b: { size: 150 } };
    const uploads: Record<string, IconUploadState> = { c: { isUploading: false, error: 'x' } };
    const before = copy({ registry, draft, saved, uploads });

    toModuleGroups(registry, draft, saved, uploads, () => noHandlers);

    expect({ registry, draft, saved, uploads }).toEqual(before);
  });
});
