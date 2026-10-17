# Plan: Icon registry, override config, testbed Icon Editor

Status: APPROVED
Inputs: triage.md, ui-design.md (Final spec), docs/ai/tasks/2026-10-17-icon-editor-testbed/plan.md (parent roadmap — Decisions and L-task #1 File plan are the starting estimate; this plan re-derives the exact detail per that roadmap's own note)

## Goal and acceptance criteria
- [ ] `src/modules/icons/` exports a hand-authored `IconRegistryEntry[]` covering every distinct icon in active use (lucide glyphs + the 5 shared sprite icons), grouped by module, and an `IconOverridesConfig` type/file starting `{}`.
- [ ] Two dev-only API routes exist under `src/app/api/icon-editor/`: `uploads/route.ts` (GET list, POST upload) and `overrides/route.ts` (POST save), both 404 in production.
- [ ] `IconEditor` testbed component renders at `/testbed/icon-editor`: accordion list grouped by module, per-icon upload/rotation/size controls, live thumbnail, global Save — matching every state and acceptance criterion in `ui-design.md`'s Final spec.
- [ ] No render site (`FightIcon`, any combat/cards/hud/map/lobby/session component) is touched — testbed-only, per triage.md's Scope.

## Verified context
| Symbol or file | Location | Why it matters |
|---|---|---|
| `DecorationLayoutsConfig`, `DECORATION_LAYOUTS_CONFIG_PATH`, `DecorationLayout` | `src/modules/map/decoration-layouts.types.ts:1-61` | Exact precedent for one types file bundling the domain type + the config-path string constant the save route resolves with `path.join(process.cwd(), ...)`. |
| `listDecorationImages`, `saveDecorationLayouts` | `src/testbed/components/TileDecorationEditor/TileDecorationEditor.service.ts:10-32` | Precedent for the only-`fetch`-callers file; same shape reused for `listIconUploads`/`uploadIconImage`/`saveIconOverrides`. |
| `GET /api/tile-decoration-editor/images` | `src/app/api/tile-decoration-editor/images/route.ts:1-21` | Precedent for the `NODE_ENV==='production'` 404 gate and `readdir`+extension-filter+path-prefix pattern, reused by the new uploads route's GET. |
| `POST /api/tile-decoration-editor/layouts` | `src/app/api/tile-decoration-editor/layouts/route.ts:1-36` | Precedent for a save route: shallow runtime type guard on the parsed body, `writeFile(path.join(process.cwd(), CONFIG_PATH), JSON.stringify(...))`, 400 on bad shape. Reused by the new overrides route. |
| `route.test.ts` polyfill + `jest.mock('fs/promises', ...)` pattern | `src/app/api/tile-decoration-editor/images/route.test.ts:1-35` | Exact boilerplate (undici polyfill, `require` not `import` for the route/fs mock, `setNodeEnv` helper) tester-a's two route tests must reuse verbatim. |
| `TileDecorationEditorViewModel`, `EditorStatus` | `src/testbed/components/TileDecorationEditor/TileDecorationEditor.types.ts:14-30` | Precedent for one view-model interface per editor, an `idle/saving/saved/error` status union, and request/response body interfaces living in the same `.types.ts`. |
| `useTileDecorationEditor` | `src/testbed/components/TileDecorationEditor/TileDecorationEditor.hook.ts:26-169` | Precedent for: static-import the config as initial state, one `useEffect` to fetch the images list, a save handler that snapshots state before the request and guards against a mid-flight edit. This plan's hook simplifies the stale-save guard (see Decisions). |
| `TileDecorationEditorSaveRow`, its `STATUS_TEXT` map | `src/testbed/components/TileDecorationEditor/TileDecorationEditorSaveRow.tsx:1-43` | Verbatim-reusable copy: `STATUS_TEXT.saved = 'Saved.'`, `STATUS_TEXT.error = 'Could not save — see console.'`, `styles.spinner`/`styles.statusText({status})` recipe. |
| `styles.unsavedBadge`, its usage | `src/testbed/components/TileDecorationEditor/TileDecorationEditor.styles.ts:28`, `TileDecorationEditorRail.tsx` (`<Badge variant="outline" className={styles.unsavedBadge}>Unsaved changes</Badge>`) | Verbatim token + badge markup reused for both "Overridden" and "Unsaved changes" row badges. |
| `TileDecorationEditorInspector`'s `Input` field pairing | `src/testbed/components/TileDecorationEditor/TileDecorationEditorInspector.tsx:83-107` (`styles.fieldStack`, `styles.instanceFields`, a `<label className={styles.fieldRow}>` wrapping each numeric `Input`) | Precedent for the Rotation/Size `Slider`+`Input` pairing's wrapper markup and clamp-on-change handler shape. |
| `Accordion`/`AccordionItem`/`AccordionTrigger`/`AccordionContent` | `src/components/ui/accordion.tsx:9,11-58` | Radix-backed; `defaultValue`/`value` prop accepts an array for `type="multiple"`, needed so every section starts expanded. |
| `Slider` | `src/components/ui/slider.tsx:8-26` | Thumb is `h-5 w-5` (20×20px, confirms ui-design's accessibility note); takes `min`/`max`/`step`/`value`/`onValueChange` (array) like every Radix slider. |
| `Badge`, `badgeVariants` | `src/components/ui/badge.tsx:6-36` | `variant="outline"` → `"text-foreground"` border token; ui-design's `text-accent` override is applied via `className`, same as `styles.unsavedBadge`. |
| `Button`, `asChild` | `src/components/ui/button.tsx:37-55` | `asChild` renders `Slot`, merging Button's classes onto its single child — confirms ui-design's finding 1 (the focus ring must go on the `<label>` itself via `focus-within`, since the real focusable node is the nested `sr-only` `<input>`, a sibling `Slot` never touches). |
| `ComponentPreview`, `PreviewState` | `src/testbed/testbed.types.ts:1-16` | `{ slug, title, group, states: [{ name, render }] }` — exact shape `iconEditorPreview` must satisfy. |
| `tileDecorationEditorPreview` import + array entry | `src/testbed/registry.ts:49,103` | Exact two-line edit pattern `iconEditorPreview` repeats (import line + one entry in the `previews` array). |
| `LucideIcon` type-only import | `src/modules/lobby/components/CreateGameDialog/CreateGameDialog.types.ts:2` | Confirms this is a type import, not an icon — excluded from the registry's dedup list. |
| `lucide-react` 0.475.0; `Upload`, `RotateCw`, `RotateCcw`, `Maximize2`, `Scaling`, `Loader2`, `Save` all exist | `node_modules/lucide-react/package.json`, `node_modules/lucide-react/dist/esm/icons/{upload,rotate-cw,rotate-ccw,maximize-2,scaling,loader-2,save}.js` | Verified this session; implementer-b may use either `Maximize2` or `Scaling` for the size field per ui-design's "whichever exists" note — this plan picks `Maximize2` (see Contracts) to resolve that choice once. |
| `ResourceIcon`, `FightIcon`, `InfoIcon` and their 5 sprite paths | `src/modules/shared/resource-icon.tsx:6-10`, `fight-icon.tsx:8`, `info-icon.tsx:8`, re-exported `src/modules/shared/index.ts:11-13` | The only 3 places a sprite-image icon is already behind a shared component; its 5 fixed `src` values (`icon_meat.png`, `icon_wood.png`, `icon_gold.png`, `icon_fight.png`, `icon_info.png`, all confirmed present under `public/sprites/`) are the registry's entire `kind: 'image'` seed set (see Decisions for why no other `next/image` call site is seeded). |
| 51 distinct lucide icon names across non-testbed, non-legacy-excluded modules, grepped this session | `grep -rl "from 'lucide-react'" src \| grep -v -E "\.(test\|preview)\.(ts\|tsx)$" \| grep -v "src/components/ui/"`, then every import line in each surviving file, read in full this session | Direct basis for the registry's `kind: 'lucide'` seed set (Contracts block below lists every entry with its assigned module). |
| `tsconfig.json:12` `resolveJsonModule: true` | not re-read this session, carried from parent roadmap's own citation (`docs/ai/tasks/2026-10-17-icon-editor-testbed/plan.md` Verified context) | Lets both `icon-registry.config.json` and `icon-overrides.config.json` be statically imported, same as `decoration-layouts.config.json`. |
| No e2e spec exists for the decoration editor (`find e2e -iname "*decoration*"` → none) | checked this session | Confirms no e2e spec is needed for this testbed-only tool either. |

## Decisions
- **Registry's `kind: 'image'` entries are seeded only from the 5 sprites behind `ResourceIcon`/`FightIcon`/`InfoIcon`** (`icon_meat.png`, `icon_wood.png`, `icon_gold.png`, `icon_fight.png`, `icon_info.png`), not from any of the other 33 `next/image`-importing files, because every other call site renders per-instance or per-type *data* already owned by its own source of truth (`DecorationInstance.image` in `decoration-layouts.config.json`, `MONSTER_DATA`'s monster sprites, a player's avatar) — registering those paths here would create a second, competing source of truth for the same value. Rejected: seeding every `next/image` call site's literal `src` string (duplicates existing config ownership, and most of those `src` values are runtime-computed, not literal strings greppable as "an icon").
- **Testbed-internal icons are excluded** (`Trash2`, `Copy`, `Plus`, `Loader2`, `Save` imported only inside `TileDecorationEditor*.tsx`), because triage.md's scope is "every distinct icon in the game," and a dev tool's own chrome isn't part of the game. Rejected: including them (no render site will ever need to override a dev tool's icon; pure scope creep).
- **Module assignment = the module folder of the icon's alphabetically-first surviving file this session** (the sorted `grep -rl` file list in Verified context), not a semantic "which domain does this icon feel like" judgment call. An icon such as `Swords` or `Trophy` is reused across combat, hud, lobby and session; a semantic call would need a debatable, unauditable decision per multi-use icon. The alphabetical-first rule is deterministic, reviewable by rerunning the same `sort`, and the registry stays hand-editable later if a reviewer disagrees with one assignment. Rejected: semantic domain grouping (more "intuitive" per icon, but each of the ~15 multi-module icons needs its own unreviewable judgment call).
- **Both config JSON files are statically imported** (`import iconRegistry from './icon-registry.config.json'`, same for overrides), not fetched, mirroring `decorationLayoutsConfig`'s own pattern — `resolveJsonModule: true` already makes this work, and both files ship inside the app bundle already; no network round-trip buys anything a static import doesn't already give for free. Rejected: a GET route for the registry/overrides (the parent roadmap's hook comment left this "TBD"; resolved here to static import since nothing about either file is actually dynamic).
- **Per-icon dirty/override state is derived, not tracked in a separate flag.** `hasSavedOverride(id)` = `id in savedOverrides`; `isDirty(id)` = `JSON.stringify(savedOverrides[id] ?? {}) !== JSON.stringify(draftOverrides[id] ?? {})`, recomputed every render from two plain `IconOverridesConfig` objects (`savedOverrides` = what the last successful save persisted, `draftOverrides` = the in-memory edit buffer). This removes the whole class of stale-ref bugs `useTileDecorationEditor`'s `latestConfigRef` guard exists to catch (`TileDecorationEditor.hook.ts:39,126-127`): if a row is edited again while a save is in flight, its `draftOverrides[id]` no longer matches whatever `savedOverrides` becomes after that save resolves, so it's automatically still dirty — no manual guard needed. Rejected: one global `isDirty` boolean plus a `latestConfigRef`-style guard, copying the decoration editor's pattern exactly (works there because it only ever shows one dirty badge total; this UI needs a badge per row, so per-row derived state is required regardless, and once it exists the global Save button's `isDirty` is just `registry.some(entry => isDirty(entry.id))`).
- **`listIconUploads()` is still called once on mount** to gate the Loading state (ui-design's States table ties "Loading" to "the registry/overrides/upload-list fetch" resolving), even though this editor has no "pick an existing upload" grid — its resolved list is discarded (`.then(() => setIsLoading(false))`), never stored in the view model, so no unused field leaks into `IconEditorViewModel`. Rejected: skip the call and never show a Loading state (contradicts the approved Final spec's own States table verbatim); storing the resolved list anyway "for later" (dead data with no consumer, violates `kiss-dry-solid`'s "no unused exports").
- **Upload writes a new file per upload, named `<iconId>-<timestamp>.<ext>`**, never overwriting a previous upload for the same icon, because the editor has no delete-upload affordance and overwriting risks clobbering a file another process might still reference; stale files in `public/sprites/icon-overrides/` are an accepted dev-only cost (same tier as the decoration editor's own unmanaged `public/sprites/decorations/` growth). Rejected: overwriting `<iconId>.<ext>` (simpler path, but a second upload of a different extension would leave two files on disk anyway, and a same-extension overwrite could race with a slow in-flight save).

## File plan
| File | New / Edit | Responsibility | Owner |
|---|---|---|---|
| `src/modules/icons/icon-registry.types.ts` | new | `IconSourceKind`, `IconDefaultSource` (lucide/image union), `IconRegistryEntry`, `IconOverride`, `IconOverridesConfig`, `ICON_OVERRIDES_CONFIG_PATH` | implementer-a |
| `src/modules/icons/icon-registry.config.json` | new | Hand-authored catalog, 56 entries (51 lucide + 5 image), exact content specified in Contracts below | implementer-a |
| `src/modules/icons/icon-overrides.config.json` | new | `{}` | implementer-a |
| `src/modules/icons/index.ts` | new | Barrel: types, `iconRegistry` (typed `icon-registry.config.json` import), `iconOverridesConfig` (typed `icon-overrides.config.json` import), `ICON_OVERRIDES_CONFIG_PATH` | implementer-a |
| `src/testbed/components/IconEditor/IconEditor.types.ts` | new | `IconUploadState`, `IconRowHandlers`, `IconRowViewModel`, `IconModuleGroup`, `IconEditorStatus`, `IconEditorViewModel`, `ListIconUploadsResponseBody`, `UploadIconImageResponseBody`, `SaveIconOverridesRequestBody` | implementer-a |
| `src/testbed/components/IconEditor/IconEditor.map.ts` | new | Pure: `clampRotation`, `clampSize`, `isOverrideDirty`, `resolveCurrentSource`, `toIconRowViewModel`, `toModuleGroups` | implementer-a |
| `src/testbed/components/IconEditor/IconEditor.fixtures.ts` | new | `sampleIconRegistry` (≥3 icons spanning combat/hud/map, mixed lucide/image), `sampleSavedOverrides` (one entry), `sampleDraftOverrides` | implementer-a |
| `src/testbed/components/IconEditor/IconEditor.service.ts` | new | `listIconUploads()`, `uploadIconImage(iconId, file)`, `saveIconOverrides(overrides)` — only files that call `fetch` | implementer-a |
| `src/testbed/components/IconEditor/IconEditor.hook.ts` | new | `useIconEditor()`: loads registry/overrides (static import), fetches upload list on mount to gate `isLoading`, per-icon rotation/size/upload/reset handlers, derived dirty state, save | implementer-a |
| `src/testbed/components/IconEditor/index.ts` | new | Barrel: `IconEditor` | implementer-a |
| `src/app/api/icon-editor/uploads/route.ts` | new | `GET`: list `public/sprites/icon-overrides/` files. `POST`: accept `multipart/form-data` (`iconId`, `file`), validate extension, write to that folder, return its public path. Both 404 in production | implementer-a |
| `src/app/api/icon-editor/overrides/route.ts` | new | `POST`: validate body shape against `IconOverridesConfig`, write `ICON_OVERRIDES_CONFIG_PATH`. 404 in production | implementer-a |
| `src/testbed/components/IconEditor/IconEditor.map.test.ts` | new | `clampRotation`/`clampSize`/`isOverrideDirty`/`resolveCurrentSource`/`toModuleGroups` cases | tester-a |
| `src/testbed/components/IconEditor/IconEditor.hook.test.ts` | new | Hook cases, service mocked | tester-a |
| `src/app/api/icon-editor/uploads/route.test.ts` | new | GET/POST cases, `fs/promises` mocked, production-404 case | tester-a |
| `src/app/api/icon-editor/overrides/route.test.ts` | new | POST cases, `fs/promises` mocked, production-404 case | tester-a |
| `src/testbed/components/IconEditor/IconEditor.styles.ts` | new | Tailwind classes: header, panel, accordion row, field pairing, thumbnail transform wrapper, badges | implementer-b |
| `src/testbed/components/IconEditor/IconEditor.tsx` | new | Sticky header (title/hint/Save), `Accordion` of module groups, maps rows to `IconEditorRow` | implementer-b |
| `src/testbed/components/IconEditor/IconEditorRow.tsx` | new | One icon's row: label, live thumbnail (lucide component or `next/image`), upload control, rotation `Slider`+`Input`, size `Slider`+`Input`, badges, Reset button | implementer-b |
| `src/testbed/components/IconEditor/IconEditor.test.tsx` | new | View test, `useIconEditor` mocked | tester-b |
| `src/testbed/components/IconEditor/IconEditor.preview.tsx` | new | One state, "Editor", rendering the real `IconEditor` against `IconEditor.fixtures.ts` | preview-a |
| `src/testbed/registry.ts` | edit | Add `iconEditorPreview` import (after `tileVariantEditorPreview`'s import line) + one entry in the `previews` array | preview-a |
| `docs/architecture/systems-and-visuals.md` | edit | One short bullet noting `/testbed/icon-editor` exists, matching the existing `TileDecorationEditor`/`TileVariantEditor` notes' level of detail (see Contracts for the exact text) | docs-sync |

Docs-sync is mandatory here, not optional: triage.md's "Why this tier" explicitly calls it out, since `docs/architecture/systems-and-visuals.md` already documents the Tile Decoration Editor (`:115`) and Tile Variant Editor (`:177`) as testbed tools, and this is the same kind of documented-tooling addition.

No existing file references a not-yet-created path from this task (`grep -r "icon-editor\|IconEditor\|icon-registry\|icon-overrides" src .claude docs scripts` outside this task folder → no hits), so no additional fix-up rows are needed.

## Contracts
```ts
// ── src/modules/icons/icon-registry.types.ts ──────────────────────────────

export type IconSourceKind = 'lucide' | 'image';

/** A lucide glyph is named by its exported component name (e.g. "Swords"); an image icon is a
 *  public path (e.g. "/sprites/icon_fight.png"). One shape, so a future render site needs one
 *  lookup regardless of which kind the icon originally was. */
export type IconDefaultSource =
  | { kind: 'lucide'; name: string }
  | { kind: 'image'; src: string };

export interface IconRegistryEntry {
  /** Stable, unique. kebab-case of the lucide name ("check-circle") or the image's basename
   *  without extension ("icon-fight"). */
  id: string;
  /** Human-readable, shown verbatim as the row label. */
  label: string;
  /** Grouping key for the Accordion sections; lowercase module-folder name, or "legacy" for the
   *  two LEGACY_PATHS-exempt files. */
  module: string;
  defaultSource: IconDefaultSource;
  /** Degrees, 0-359. Always 0 for every seeded entry (no icon is pre-rotated today). */
  defaultRotation: number;
  /** Percent, 25-200. Always 100 for every seeded entry. */
  defaultSize: number;
}

/** `src` is present once the icon has an uploaded replacement image; omitted means "still the
 *  registry's own default image" even if rotation/size are overridden. */
export interface IconOverride {
  src?: string;
  rotation?: number;
  size?: number;
}

export type IconOverridesConfig = Record<string, IconOverride>;

/** Repo-relative path of icon-overrides.config.json, used by the save API route
 *  (`path.join(process.cwd(), ICON_OVERRIDES_CONFIG_PATH)`). */
export const ICON_OVERRIDES_CONFIG_PATH = 'src/modules/icons/icon-overrides.config.json';


// ── src/modules/icons/icon-registry.config.json (implementer-a writes this exact content) ─────
// 56 entries total. One object per row below: { id, label, module, defaultSource, defaultRotation: 0, defaultSize: 100 }.
// `label` = the name with a space before each internal capital (e.g. "CheckCircle" -> "Check Circle").
// lucide entries: defaultSource = { "kind": "lucide", "name": "<Name>" }.
// image entries: defaultSource = { "kind": "image", "src": "<path>" }.
//
// module "legacy" (id = kebab-case of name):
//   Loader2, ChevronDown, ChevronUp, Trophy
// module "cards":
//   CheckCircle, Award, Sparkles, Zap, Shield, Play, TrendingUp, Check, Ban, Dices, XCircle,
//   HandMetal, ArrowLeft
// module "combat":
//   Clock, Crosshair, Skull, Swords
// module "game-board":
//   RefreshCw, WifiOff
// module "hud":
//   ShoppingCart, Album, University, ScrollText, Timer, ImageIcon, Coins, Info, Layers,
//   Hourglass, Forward, Compass, ShieldCheck, Hammer, X
// module "lobby":
//   Bot, Crown, Users, HelpCircle, Settings, BookOpen, Power
// module "map":
//   Home, ZoomIn, ZoomOut, RotateCcw
// module "session":
//   AlertTriangle, LogOut
// module "shared" (kind: "image", id = kebab-case of basename without extension):
//   { id: "icon-meat",  label: "Icon Meat",  src: "/sprites/icon_meat.png"  }
//   { id: "icon-wood",  label: "Icon Wood",  src: "/sprites/icon_wood.png"  }
//   { id: "icon-gold",  label: "Icon Gold",  src: "/sprites/icon_gold.png"  }
//   { id: "icon-fight", label: "Icon Fight", src: "/sprites/icon_fight.png" }
//   { id: "icon-info",  label: "Icon Info",  src: "/sprites/icon_info.png"  }
// Every lucide id is the kebab-case of its name (e.g. "CheckCircle" -> "check-circle",
// "ImageIcon" -> "image-icon", "X" -> "x"). No two ids collide (51 lucide + 5 image, all distinct).


// ── src/modules/icons/index.ts ─────────────────────────────────────────────
export type { IconSourceKind, IconDefaultSource, IconRegistryEntry, IconOverride, IconOverridesConfig } from './icon-registry.types';
export { ICON_OVERRIDES_CONFIG_PATH } from './icon-registry.types';
export { iconRegistry } from './icon-registry'; // re-typed .json import, see below
export { iconOverridesConfig } from './icon-overrides'; // re-typed .json import, see below
// implementer-a's index.ts imports the two .json files directly and re-exports them typed:
//   import iconRegistryJson from './icon-registry.config.json';
//   import iconOverridesJson from './icon-overrides.config.json';
//   export const iconRegistry = iconRegistryJson as IconRegistryEntry[];
//   export const iconOverridesConfig = iconOverridesJson as IconOverridesConfig;


// ── src/testbed/components/IconEditor/IconEditor.types.ts ──────────────────
import type { IconDefaultSource, IconOverridesConfig, IconRegistryEntry } from '@/modules/icons';

export interface IconUploadState {
  isUploading: boolean;
  error: string | null;
}

export interface IconRowHandlers {
  onRotationChange: (rotation: number) => void;
  onSizeChange: (size: number) => void;
  onUpload: (file: File) => void;
  onReset: () => void;
}

export interface IconRowViewModel extends IconRowHandlers {
  id: string;
  label: string;
  /** What to render right now: the registry default, or an uploaded replacement's image. */
  currentSource: IconDefaultSource;
  rotation: number;
  size: number;
  hasSavedOverride: boolean;
  isDirty: boolean;
  isUploading: boolean;
  uploadError: string | null;
}

export interface IconModuleGroup {
  module: string;
  /** Count of this group's icons with hasSavedOverride true; 0 means the Accordion trigger shows
   *  no count badge. */
  overriddenCount: number;
  icons: IconRowViewModel[];
}

export type IconEditorStatus = 'idle' | 'saving' | 'saved' | 'error';

export interface IconEditorViewModel {
  isLoading: boolean;
  moduleGroups: IconModuleGroup[];
  /** True when at least one icon's isDirty is true; drives the header Save button. */
  isDirty: boolean;
  status: IconEditorStatus;
  onSave: () => void;
}

/** Body the upload POST route returns. */
export interface UploadIconImageResponseBody {
  path: string;
}

/** Body the uploads GET route returns. */
export interface ListIconUploadsResponseBody {
  images: string[];
}

/** Body the editor POSTs to the overrides save route. */
export interface SaveIconOverridesRequestBody {
  overrides: IconOverridesConfig;
}


// ── src/testbed/components/IconEditor/IconEditor.map.ts ───────────────────
import type { IconDefaultSource, IconOverride, IconOverridesConfig, IconRegistryEntry } from '@/modules/icons';
import type { IconModuleGroup, IconRowHandlers, IconRowViewModel, IconUploadState } from './IconEditor.types';

export function clampRotation(value: number): number; // Math.min(359, Math.max(0, value))
export function clampSize(value: number): number;      // Math.min(200, Math.max(25, value))

export function isOverrideDirty(saved: IconOverride | undefined, draft: IconOverride | undefined): boolean;

export function resolveCurrentSource(entry: IconRegistryEntry, draft: IconOverride | undefined): IconDefaultSource;
// draft?.src present -> { kind: 'image', src: draft.src }; else entry.defaultSource.

export function toIconRowViewModel(
  entry: IconRegistryEntry,
  draft: IconOverride | undefined,
  saved: IconOverride | undefined,
  uploadState: IconUploadState | undefined,
  handlers: IconRowHandlers,
): IconRowViewModel;

export function toModuleGroups(
  registry: IconRegistryEntry[],
  draftOverrides: IconOverridesConfig,
  savedOverrides: IconOverridesConfig,
  uploadStates: Record<string, IconUploadState>,
  makeHandlers: (iconId: string) => IconRowHandlers,
): IconModuleGroup[];
// Groups by entry.module in first-seen order (Map keyed by module, Object.values at the end).
// overriddenCount = icons.filter(icon => icon.hasSavedOverride).length per group.


// ── src/testbed/components/IconEditor/IconEditor.service.ts ───────────────
export async function listIconUploads(): Promise<string[]>;        // GET /api/icon-editor/uploads
export async function uploadIconImage(iconId: string, file: File): Promise<string>; // POST, multipart/form-data, returns the response's `path`
export async function saveIconOverrides(overrides: IconOverridesConfig): Promise<void>; // POST /api/icon-editor/overrides


// ── src/testbed/components/IconEditor/IconEditor.hook.ts ──────────────────
export function useIconEditor(): IconEditorViewModel;
// State: isLoading (true until listIconUploads() resolves or rejects);
//   savedOverrides (IconOverridesConfig, starts as a structuredClone of iconOverridesConfig);
//   draftOverrides (IconOverridesConfig, starts as a structuredClone of iconOverridesConfig);
//   uploadStates (Record<string, IconUploadState>);
//   status (IconEditorStatus).
// onRotationChange(id, value) / onSizeChange(id, value): clamp, merge into draftOverrides[id].
// onUpload(id, file): set uploadStates[id] = {isUploading:true, error:null}; on success merge
//   { src: path } into draftOverrides[id]; on failure set uploadStates[id].error, leave
//   draftOverrides untouched.
// onReset(id): delete draftOverrides[id] entirely (not set to {}).
// onSave(): status='saving'; saveIconOverrides(draftOverrides); on success setSavedOverrides(the
//   exact object just sent) and status='saved' (auto-clears to 'idle' after 2000ms, same
//   SAVED_BADGE_DURATION_MS pattern as TileDecorationEditor.hook.ts:19,129-130); on failure
//   status='error', draftOverrides unchanged.


// ── src/app/api/icon-editor/uploads/route.ts ───────────────────────────────
const UPLOADS_DIR = 'public/sprites/icon-overrides';
const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp']);
export async function GET(): Promise<Response>;
// 404 in production. readdir(UPLOADS_DIR), filter by IMAGE_EXTENSIONS, map to
// `/sprites/icon-overrides/<file>`, return { images } satisfies ListIconUploadsResponseBody.

export async function POST(request: Request): Promise<Response>;
// 404 in production. const formData = await request.formData();
// const iconId = formData.get('iconId'); const file = formData.get('file');
// 400 if iconId isn't a non-empty string or file isn't a File, or its extension isn't in
// IMAGE_EXTENSIONS (path.extname(file.name).toLowerCase()).
// filename = `${iconId}-${Date.now()}${path.extname(file.name).toLowerCase()}`;
// mkdir(UPLOADS_DIR, { recursive: true }) before the first write (the decoration editor's
// public/sprites/decorations/ already exists on disk; this new folder does not yet).
// writeFile(path.join(process.cwd(), UPLOADS_DIR, filename), Buffer.from(await file.arrayBuffer()));
// return NextResponse.json({ path: `/sprites/icon-overrides/${filename}` } satisfies UploadIconImageResponseBody).


// ── src/app/api/icon-editor/overrides/route.ts ─────────────────────────────
export async function POST(request: Request): Promise<Response>;
// 404 in production. const body = (await request.json()) as { overrides?: unknown };
// isIconOverridesConfig(body.overrides) runtime guard: typeof === 'object', not null, and every
// own-value is an object whose only present keys among src/rotation/size have the right typeof
// (string/number/number) — no check against the registry's known ids (overrides may reference
// any id; the route doesn't import the registry, same decoupling as the decoration editor's
// layouts route not importing the decoration image list).
// 400 with { error: '...' } if the guard fails.
// writeFile(path.join(process.cwd(), ICON_OVERRIDES_CONFIG_PATH), JSON.stringify(body.overrides, null, 2));
// return NextResponse.json({ ok: true }).
```

```md
<!-- docs/architecture/systems-and-visuals.md — docs-sync adds this one bullet at the end of
     §6.15 "Tile Art Variants, Fog & Decorations (Dev Tooling)", matching that section's own
     bullets' level of detail (one short paragraph, no new heading needed — this is the same
     kind of documented dev-tooling addition as the TileDecorationEditor/TileVariantEditor
     bullets already there at :115 and :177). -->
- **Icon registry & editor (`src/modules/icons/`, `/testbed/icon-editor`)**: `icon-registry.config.json`
  hand-catalogs every distinct icon in the game (lucide glyphs and the shared sprite icons),
  grouped by module; `icon-overrides.config.json` holds per-icon upload/rotation/size overrides,
  edited through the testbed's Icon Editor (upload a replacement image, rotation 0-359°, size
  25-200%, live preview, one global Save). Testbed-only for now: no render site reads the
  overrides yet.
```

## Phases

### Phase 1: Logic layer — registry, overrides, hook, API routes
1. `src/modules/icons/icon-registry.types.ts`, `icon-registry.config.json` (56 entries exactly as listed in Contracts), `icon-overrides.config.json` (`{}`), `index.ts` (implementer-a). **Needs sonnet**: transcribing 56 entries correctly (id/label/module/defaultSource) without a typo is error-prone for haiku; escalate.
2. `src/app/api/icon-editor/uploads/route.ts`, `src/app/api/icon-editor/overrides/route.ts` (implementer-a).
3. `IconEditor.types.ts`, `IconEditor.map.ts`, `IconEditor.fixtures.ts`, `IconEditor.service.ts`, `IconEditor.hook.ts`, `index.ts` (implementer-a).
4. `IconEditor.map.test.ts`, `IconEditor.hook.test.ts`, both `route.test.ts` files (tester-a), reusing the undici-polyfill boilerplate from `src/app/api/tile-decoration-editor/images/route.test.ts:1-35`.
5. Checks: `npm run typecheck`, `npm run lint`, `npm test` on every Phase 1 file. Commit, then stop and ask the user to type `continue`.

Model escalation: step 1 (56-entry transcription) needs sonnet; steps 2-4 are mechanical enough for haiku once Phase 1's Contracts are fixed.

### Phase 2: View layer — styles, view, row, preview, registry wiring
1. `IconEditor.styles.ts` (implementer-b).
2. `IconEditorRow.tsx` — thumbnail (lucide component lookup by name, or `next/image` for `kind: 'image'`, with `transform: rotate(<deg>deg) scale(<pct/100>)` inline per ui-design), upload `<label>` with `focus-within:ring-2 focus-within:ring-ring` (ui-design's Final-spec correction), rotation/size `Slider`+`Input` pairs with `aria-label`, Overridden/Unsaved-changes badges, Reset button (implementer-b).
3. `IconEditor.tsx` — sticky header (title, hint, global Save using the `STATUS_TEXT`/`styles.statusText`/`styles.spinner` recipe verbatim from `TileDecorationEditorSaveRow.tsx`), `Accordion type="multiple"` with every module's key in `defaultValue` so all sections start expanded, one `AccordionItem` per `IconModuleGroup` (implementer-b).
4. `IconEditor.test.tsx` (tester-b): loading, default row, overridden row, dirty row (slider drag), upload in progress/error, save idle/saving/saved/error, every `Slider` has an `aria-label`.
5. `IconEditor.preview.tsx`, `src/testbed/registry.ts` edit (preview-a).
6. `docs/architecture/systems-and-visuals.md` — add the one bullet from Contracts above, after the view has landed so the described route/behavior is real (docs-sync).
7. Checks: `npm run typecheck`, `npm run lint`, `npm test` on every changed file; `npm run dev` + `node .claude/skills/ui-verify/scripts/snapshot.mjs http://localhost:9002/testbed/icon-editor` at 1280×720 and 390×844. Commit, then stop and ask the user to type `continue`.

Model escalation: none — Phase 2 is mechanical composition of existing primitives against Phase 1's fixed contracts.

## Test plan
- tester-a (`IconEditor.map.test.ts`): `clampRotation`/`clampSize` clamp both ends and pass values inside range through unchanged; `isOverrideDirty` returns false for `(undefined, undefined)` and for equal objects, true for any differing field; `resolveCurrentSource` returns the registry default when no draft `src`, and `{kind:'image', src}` when one is set; `toModuleGroups` groups a 3-icon, 2-module sample in first-seen module order and computes `overriddenCount` correctly when 0, 1 and all icons in a group are overridden.
- tester-a (`IconEditor.hook.test.ts`, service mocked): `onRotationChange`/`onSizeChange` clamp and mark only that icon dirty; `onUpload` success sets `isUploading` then clears it and sets the new `src`; `onUpload` failure sets `uploadError` and leaves the prior override untouched; `onReset` removes the icon's override entirely and marks it dirty; `onSave` success updates `savedOverrides` and clears dirty for untouched icons, but a row edited again before the save resolves stays dirty after it resolves; `onSave` failure sets `status: 'error'` and leaves `draftOverrides` untouched; `isLoading` starts true and becomes false after `listIconUploads()` resolves (and also after it rejects).
- tester-a (both `route.test.ts`): GET lists files filtered to the 5 extensions, 404s in production; POST with a valid file+iconId writes it and returns `{ path }`, POST with a missing field or disallowed extension returns 400, POST 404s in production without writing; overrides POST with a valid body writes the file and returns `{ ok: true }`, with an invalid body returns 400 and never calls `writeFile`, 404s in production.
- tester-b (`IconEditor.test.tsx`, hook mocked): Loading state shows the spinner and "Loading icons…"; a default (no-override) row shows no "Overridden" badge, rotation slider at 0, size slider at 100, no Reset button; dragging a slider calls the right handler and the badge/header Save button update to the mocked dirty state; an overridden row shows the "Overridden" badge and a Reset button; the Upload button shows "Uploading…" + disabled while `isUploading`, and the error text when `uploadError` is set; the header Save button is disabled when `isDirty` is false and enabled when true, and shows "Saved."/"Could not save — see console." per `status`; every `Slider` has an `aria-label` naming the icon and field (`getByRole('slider', { name: ... })`).

## Preview states
- `IconEditor`: one state, "Editor", rendering the real `IconEditor` against `IconEditor.fixtures.ts`'s sample registry (at least 3 icons spanning combat/hud/map, mixing `kind: 'lucide'` and `kind: 'image'`) and a sample overrides config with one icon already overridden and one not — `IconEditor.service.ts`'s three functions mocked at the preview level, same pattern as `TileDecorationEditor.preview.tsx` (which renders the real component directly; its service hits the real dev-only routes in the testbed, so this preview does the same unless `ui-verify` shows that failing against a cold dev server, in which case preview-a mocks the service instead — call this out in the preview's own file comment).

## Risks
- **56 hand-transcribed registry entries is more error-prone than a typical config file.** Mitigated by escalating Phase 1 step 1 to sonnet and by `IconEditor.map.test.ts`'s `toModuleGroups` case exercising real module names, which will fail loudly if a `module` field is misspelled inconsistently.
- **Module assignment by alphabetical-first-file is mechanical, not a design review of which module "really" owns each icon.** Accepted per the Decisions entry; a human can re-assign any `module` field later by hand-editing the JSON — no code change needed, since nothing else derives module values from anything but this file.
- **The uploads directory (`public/sprites/icon-overrides/`) doesn't exist yet.** The POST route must `mkdir(..., { recursive: true })` before its first `writeFile`, unlike the decoration editor's GET/POST routes which assume `public/sprites/decorations/` already exists — called out explicitly in the Contracts block so implementer-a doesn't copy that assumption.

## Review (architect-b)
VERDICT: APPROVED

Round 2: re-verified the fix. `docs/architecture/systems-and-visuals.md:165-178` confirms §6.15 "Tile Art Variants, Fog & Decorations (Dev Tooling)" exists with the cited `TileDecorationEditor` (`:177`) and fog (`:178`) testbed-tool bullets at the stated level of detail, so the new bullet's placement and tone match. File plan now has the `docs/architecture/systems-and-visuals.md | edit | ... | docs-sync` row, the exact bullet text is in a fenced block at the end of Contracts, Phase 2 step 6 adds it after the view lands and before Phase 2's checks/commit step, and `progress.md`'s Phase 2 block has the matching `docs-sync: systems-and-visuals.md note added` checkbox. No new issues from this change. All round-1 findings below stand verified.

Round 1 re-verified and found correct (unchanged by this revision):

Round 1 re-verified and found correct (unchanged by this revision):
- The 51-distinct-lucide-name grep and dedup: independently re-ran `grep -rl "from 'lucide-react'" src | grep -v -E "\.(test|preview)\.(ts|tsx)$" | grep -v "src/components/ui/" | grep -v "src/testbed/"` (42 files), extracted every imported name from each import line, and got exactly the same 51 names. Independently re-derived "module = module folder of the alphabetically-first surviving file" for all 51 and got the exact same module assignment as the Contracts block's per-module lists, including the non-obvious ones (`Ban` → cards not hud, `ArrowLeft` → cards not hud, `Compass`/`Info`/`Timer` → hud not lobby/combat). 51 lucide + 5 image = 56, no id collisions (kebab-case of 51 distinct PascalCase names plus 5 distinct image basenames).
- The 5 image-kind icons: `ResourceIcon`/`FightIcon`/`InfoIcon` and their 5 `src` values confirmed at `src/modules/shared/resource-icon.tsx:6-10`, `fight-icon.tsx:8`, `info-icon.tsx:8`, all 5 files present under `public/sprites/`. Excluding the other `next/image`-importing files is the right call — confirmed by listing them (`grep -rl "from 'next/image'" src`, 36 files total, 33 besides the 3 shared-icon files): every one renders `DecorationInstance.image`, a monster's sprite, a player's own uploaded avatar, or similar per-instance/per-type data already owned by its own config — not a fixed icon. Corrected the plan's own count from "34" to "33" in the Decisions block (trivial, folded in).
- `Upload`, `RotateCw`, `RotateCcw`, `Maximize2`, `Scaling`, `Loader2`, `Save` all confirmed present in the installed `lucide-react@0.475.0` (`node_modules/lucide-react/dist/esm/icons/{upload,rotate-cw,rotate-ccw,maximize-2,scaling,loader-2,save}.js`).
- Phase 1/2 split (logic vs view) is sound: File plan's Phase 1 rows (types, config JSONs, index, both API routes, map/fixtures/service/hook, tests) are exactly what Phase 1's own Contracts specify, no view-layer file leaks into Phase 1 and no logic file leaks into Phase 2. File counts match the parent roadmap's own ~20-file L-task estimate and mirror the Tile Decoration Editor precedent's logic/view split.
- The derived dirty-tracking design (`isDirty(id)` recomputed from `draftOverrides`/`savedOverrides` each render, no `latestConfigRef`-style guard) is justified: this UI needs a per-row dirty badge (unlike the decoration editor's single global badge), so per-row state must exist regardless; once it exists, re-deriving per-row dirty on every render is simpler than maintaining a second guard mechanism, and it structurally prevents the exact "edited again mid-flight" stale-state bug the decoration editor's `latestConfigRef` exists to patch over (confirmed decision text against `TileDecorationEditor.hook.ts:39,126-127`, cited correctly).
- Every other Verified-context precedent citation (`DecorationLayoutsConfig`, `listDecorationImages`/`saveDecorationLayouts`, both route files, the route test's polyfill pattern, `TileDecorationEditorSaveRow`'s `STATUS_TEXT`, `styles.unsavedBadge`, the Inspector's field-pairing markup, `Accordion`/`Slider`/`Badge`/`Button`, `ComponentPreview`/`PreviewState`, the `registry.ts` import pattern, `CreateGameDialog.types.ts`'s type-only `LucideIcon` import) re-read and matches exactly, including line numbers.
- Re-ran `grep -r "icon-editor\|IconEditor\|icon-registry\|icon-overrides" src .claude docs scripts` outside the task folder: no hits, confirming no other file needs a fix-up row.

Round 1 finding (blocking) and its fix:
- **No docs-sync target.** `triage.md`'s "Why this tier" states docs-sync is mandatory for this task because adding the Icon Editor is "the same kind of documented-tooling addition" as the Tile Decoration Editor, which `docs/architecture/systems-and-visuals.md` already documents inline (line 115's note on `TileDecorationEditor`'s "Default elements" mode, line 177's `/testbed/tile-variant-editor` entry, line 178's fog-timing/fog-variants testbed note). The File plan had no row for `docs/architecture/systems-and-visuals.md` with Owner `docs-sync`, and neither phase's step list mentioned docs-sync.
  - **Fixed**: added a File plan row for `docs/architecture/systems-and-visuals.md` (Owner: docs-sync), the exact bullet text in a fenced block at the end of Contracts, and Phase 2 step 6 (docs-sync, after the view lands and before Phase 2's checks/commit step) plus a matching checkbox in `progress.md`'s Phase 2 block.
