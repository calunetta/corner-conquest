import type { IconDefaultSource, IconOverridesConfig } from '@/modules/icons';

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
