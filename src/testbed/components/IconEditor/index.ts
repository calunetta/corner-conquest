// NOTE: implementer-b adds `export { IconEditor, IconEditorView } from './IconEditor';` here once
// IconEditor.tsx lands in Phase 2 — Phase 1 is logic-only, and that file doesn't exist yet.
export { useIconEditor } from './IconEditor.hook';
export { listIconUploads, saveIconOverrides, uploadIconImage } from './IconEditor.service';
export type {
  IconEditorStatus,
  IconEditorViewModel,
  IconModuleGroup,
  IconRowHandlers,
  IconRowViewModel,
  IconUploadState,
  ListIconUploadsResponseBody,
  SaveIconOverridesRequestBody,
  UploadIconImageResponseBody,
} from './IconEditor.types';
