import type { DecorationLayout, DecorationLayoutsConfig, DecorationScenarioKey } from '@/modules/map';
import type { TileImage, TileVariant } from '@/modules/map/components/TileVariants/TileVariants.config';
import type { DefaultElementsEditorState } from './TileDecorationEditor.defaultElements.hook';

export type EditorMode = 'decorations' | 'default-elements';

/** One outer scenario `<Select>` option. `variants` is empty for Base/Special, which have no
 *  sub-picker and resolve directly to a `DecorationScenarioKey` equal to their own `key`. */
export interface EditorScenarioOption {
  key: string;
  label: string;
  variants: { key: DecorationScenarioKey; label: string }[];
}

export type EditorStatus = 'idle' | 'saving' | 'saved' | 'error' | 'conflict';

export interface TileDecorationEditorViewModel {
  mode: EditorMode;
  onModeChange: (mode: EditorMode) => void;
  defaultElements: DefaultElementsEditorState;
  scenarioOptions: EditorScenarioOption[];
  activeScenario: string;
  /** null only for Base/Special, which have no sub-picker. */
  activeVariant: DecorationScenarioKey | null;
  layouts: DecorationLayout[];
  activeLayoutId: string;
  selectedInstanceId: string | null;
  images: string[];
  isDirty: boolean;
  status: EditorStatus;
  /** The art variants this scenario can be decorated for; 'default' is the built-in decorations. */
  artOptions: { id: string; label: string }[];
  artVariantId: string;
  /** The art variant being decorated, drawn on the canvas; null for the built-in default. */
  artVariant: TileVariant | null;
  artImages: TileImage[];
  onArtVariantChange: (id: string, key?: DecorationScenarioKey) => void;
  /** false when the active scenario/variant has only one layout — it can't be deleted. */
  canDeleteActiveLayout: boolean;
  onScenarioChange: (outerKey: string) => void;
  onVariantChange: (variant: DecorationScenarioKey) => void;
  onSelectLayout: (layoutId: string) => void;
  onAddLayout: (name: string) => void;
  onDuplicateLayout: () => void;
  onRenameLayout: (name: string) => void;
  onDeleteLayout: () => void;
  onAddInstance: (image: string) => void;
  onSelectInstance: (instanceId: string | null) => void;
  /** top/left are already clamped to 0-100 by the caller (the drag handler). */
  onDragInstance: (instanceId: string, top: number, left: number) => void;
  /** dTop/dLeft are raw, signed (-5..5); the hook clamps the result. */
  onNudgeInstance: (instanceId: string, dTop: number, dLeft: number) => void;
  onResizeInstance: (instanceId: string, size: number) => void;
  onRelayerInstance: (instanceId: string, z: number) => void;
  onRemoveInstance: (instanceId: string) => void;
  /** Deletes the image file and its instances everywhere. Disabled while there are unsaved edits. */
  onDeleteImage: (image: string) => Promise<void>;
  onSave: () => void;
}

/** Body the editor POSTs to the save API route. */
export interface SaveDecorationLayoutsRequestBody {
  config: DecorationLayoutsConfig;
}

/** Body the images API route returns. */
export interface ListDecorationImagesResponseBody {
  images: string[];
}
