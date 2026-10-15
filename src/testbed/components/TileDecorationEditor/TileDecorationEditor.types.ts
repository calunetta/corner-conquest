import type { DecorationLayout, DecorationLayoutsConfig, DecorationScenarioKey } from '@/modules/map';

/** One outer scenario `<Select>` option. `variants` is empty for Base/Special, which have no
 *  sub-picker and resolve directly to a `DecorationScenarioKey` equal to their own `key`. */
export interface EditorScenarioOption {
  key: string;
  label: string;
  variants: { key: DecorationScenarioKey; label: string }[];
}

export type EditorStatus = 'idle' | 'saving' | 'saved' | 'error';

export interface TileDecorationEditorViewModel {
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
