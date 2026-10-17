import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { IconEditor, IconEditorView } from './IconEditor';
import { useIconEditor } from './IconEditor.hook';
import { sampleDraftOverrides, sampleIconRegistry, sampleSavedOverrides } from './IconEditor.fixtures';
import { toModuleGroups } from './IconEditor.map';
import type { IconEditorStatus, IconEditorViewModel, IconRowHandlers, IconUploadState } from './IconEditor.types';
import type { IconOverridesConfig } from '@/modules/icons';

jest.mock('next/image', () => ({
  __esModule: true,
  default: ({ src, alt, className }: { src: string; alt: string; className?: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} className={className} />
  ),
}));

jest.mock('./IconEditor.hook', () => ({ useIconEditor: jest.fn() }));

// Radix Slider measures its thumb with ResizeObserver, which jsdom does not provide.
if (typeof window !== 'undefined' && !window.ResizeObserver) {
  window.ResizeObserver = jest.fn().mockImplementation(() => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
  }));
}

const UPLOAD_ERROR_TEXT = 'Could not upload — check the file type and try again.';
const SAVE_FAILED_TEXT = 'Could not save — see console.';

type HandlerMocks = Record<keyof IconRowHandlers, jest.Mock>;

interface EditorOptions {
  isLoading?: boolean;
  draft?: IconOverridesConfig;
  saved?: IconOverridesConfig;
  uploadStates?: Record<string, IconUploadState>;
  isDirty?: boolean;
  status?: IconEditorStatus;
}

/** Builds the real view model from the sample registry, so the rows get the same shape the hook
 *  produces. Every row's handlers are jest.fn and keyed by icon id for per-icon assertions. */
function renderEditor({
  isLoading = false,
  draft = sampleDraftOverrides,
  saved = sampleSavedOverrides,
  uploadStates = {},
  isDirty = true,
  status = 'idle',
}: EditorOptions = {}) {
  const handlersById: Record<string, HandlerMocks> = {};
  const onSave = jest.fn();

  const moduleGroups = toModuleGroups(sampleIconRegistry, draft, saved, uploadStates, (iconId) => {
    const handlers: HandlerMocks = {
      onRotationChange: jest.fn(),
      onSizeChange: jest.fn(),
      onUpload: jest.fn(),
      onReset: jest.fn(),
    };
    handlersById[iconId] = handlers;
    return handlers;
  });

  const viewModel: IconEditorViewModel = { isLoading, moduleGroups, isDirty, status, onSave };
  render(<IconEditorView {...viewModel} />);

  return { onSave, handlersById };
}

/** Rows have no role of their own. The row label's parents are, in order: the header, the controls
 *  column, and the row itself. */
function rowFor(label: string): HTMLElement {
  const row = screen.getByText(label, { selector: 'span' }).parentElement?.parentElement?.parentElement;
  if (!row) throw new Error(`Row for "${label}" not found in the rendered tree`);
  return row;
}

describe('IconEditorView', () => {
  describe('loading', () => {
    it('shows the spinner and "Loading icons…" and no module sections while loading', () => {
      renderEditor({ isLoading: true });

      expect(screen.getByText('Loading icons…')).toBeInTheDocument();
      expect(screen.getByTestId('lucide-icon-loader2')).toBeInTheDocument();
      expect(screen.queryByRole('slider')).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /combat/ })).not.toBeInTheDocument();
    });

    it('shows the module sections and no loading text once loaded', () => {
      renderEditor({ isLoading: false });

      expect(screen.queryByText('Loading icons…')).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: /combat/ })).toBeInTheDocument();
    });
  });

  describe('rows', () => {
    it('renders a default row with no badges, no Reset button, rotation 0 and size 100', () => {
      renderEditor();
      const row = within(rowFor('Swords'));

      expect(row.queryByText('Overridden')).not.toBeInTheDocument();
      expect(row.queryByText('Unsaved changes')).not.toBeInTheDocument();
      expect(row.queryByRole('button', { name: 'Reset to default' })).not.toBeInTheDocument();
      expect(row.getByRole('spinbutton', { name: 'Rotation for Swords icon, degrees' })).toHaveValue(0);
      expect(row.getByRole('spinbutton', { name: 'Size for Swords icon, percent of default' })).toHaveValue(100);
      expect(row.getByRole('slider', { name: 'Rotation for Swords icon, degrees' })).toHaveAttribute('aria-valuenow', '0');
      expect(row.getByRole('slider', { name: 'Size for Swords icon, percent of default' })).toHaveAttribute('aria-valuenow', '100');
    });

    it('renders a saved-override row with the Overridden badge and a Reset button, without Unsaved changes', () => {
      renderEditor();
      const row = within(rowFor('Info'));

      expect(row.getByText('Overridden')).toBeInTheDocument();
      expect(row.getByRole('button', { name: 'Reset to default' })).toBeInTheDocument();
      expect(row.queryByText('Unsaved changes')).not.toBeInTheDocument();
      expect(row.getByRole('spinbutton', { name: 'Rotation for Info icon, degrees' })).toHaveValue(45);
    });

    it('renders a draft-only row with Unsaved changes but no Overridden badge or Reset button', () => {
      renderEditor();
      const row = within(rowFor('Zoom In'));

      expect(row.getByText('Unsaved changes')).toBeInTheDocument();
      expect(row.queryByText('Overridden')).not.toBeInTheDocument();
      expect(row.queryByRole('button', { name: 'Reset to default' })).not.toBeInTheDocument();
      expect(row.getByRole('slider', { name: 'Rotation for Zoom In icon, degrees' })).toHaveAttribute('aria-valuenow', '90');
    });

    it('shows the Overridden badge on exactly the icons with a saved override', () => {
      renderEditor();

      expect(screen.getAllByText('Overridden')).toHaveLength(1);
    });

    it('shows the uploaded image source as the row thumbnail', () => {
      renderEditor({
        draft: { swords: { src: '/sprites/icon-overrides/swords-1.png' } },
        saved: {},
      });

      expect(rowFor('Swords').querySelector('img')).toHaveAttribute('src', '/sprites/icon-overrides/swords-1.png');
    });
  });

  describe('module headers', () => {
    it('shows the overridden count on a module with a saved override', () => {
      renderEditor();

      expect(within(screen.getByRole('button', { name: /hud/ })).getByText('1 overridden')).toBeInTheDocument();
    });

    it('shows no overridden count on a module with no saved overrides, even when its icon is dirty', () => {
      renderEditor();

      expect(within(screen.getByRole('button', { name: /map/ })).queryByText(/overridden/)).not.toBeInTheDocument();
      expect(within(screen.getByRole('button', { name: /combat/ })).queryByText(/overridden/)).not.toBeInTheDocument();
    });
  });

  describe('rotation and size controls', () => {
    it('calls only the edited icon\'s onRotationChange with the typed value', () => {
      const { handlersById } = renderEditor();

      const input = within(rowFor('Swords')).getByRole('spinbutton', { name: 'Rotation for Swords icon, degrees' });
      fireEvent.change(input, { target: { value: '30' } });
      expect(handlersById.swords.onRotationChange).not.toHaveBeenCalled();

      fireEvent.blur(input);
      expect(handlersById.swords.onRotationChange).toHaveBeenCalledTimes(1);
      expect(handlersById.swords.onRotationChange).toHaveBeenCalledWith(30);
      expect(handlersById.info.onRotationChange).not.toHaveBeenCalled();
    });

    it('calls onSizeChange with the typed value from the size number input', () => {
      const { handlersById } = renderEditor();

      const input = within(rowFor('Swords')).getByRole('spinbutton', { name: 'Size for Swords icon, percent of default' });
      fireEvent.change(input, { target: { value: '50' } });
      fireEvent.blur(input);

      expect(handlersById.swords.onSizeChange).toHaveBeenCalledWith(50);
      expect(handlersById.swords.onRotationChange).not.toHaveBeenCalled();
    });

    it('keeps the typed text while focused and does not commit an empty field', () => {
      const { handlersById } = renderEditor();
      const input = within(rowFor('Swords')).getByRole('spinbutton', { name: 'Size for Swords icon, percent of default' });

      fireEvent.change(input, { target: { value: '' } });
      expect(input).toHaveValue(null);
      expect(handlersById.swords.onSizeChange).not.toHaveBeenCalled();

      fireEvent.change(input, { target: { value: '150' } });
      fireEvent.blur(input);

      expect(handlersById.swords.onSizeChange).toHaveBeenCalledTimes(1);
      expect(handlersById.swords.onSizeChange).toHaveBeenCalledWith(150);
    });

    it('reverts the input to the committed value when blurred with an empty field', () => {
      const { handlersById } = renderEditor();
      const input = within(rowFor('Swords')).getByRole('spinbutton', { name: 'Size for Swords icon, percent of default' });

      fireEvent.change(input, { target: { value: '' } });
      fireEvent.blur(input);

      expect(handlersById.swords.onSizeChange).not.toHaveBeenCalled();
      expect(input).toHaveValue(100);
    });

    it('steps the rotation slider by 1 degree from the keyboard', () => {
      const { handlersById } = renderEditor();

      fireEvent.keyDown(within(rowFor('Swords')).getByRole('slider', { name: 'Rotation for Swords icon, degrees' }), {
        key: 'ArrowRight',
      });

      expect(handlersById.swords.onRotationChange).toHaveBeenCalledWith(1);
    });

    it('steps the size slider by 5 percent from the keyboard', () => {
      const { handlersById } = renderEditor();

      fireEvent.keyDown(within(rowFor('Swords')).getByRole('slider', { name: 'Size for Swords icon, percent of default' }), {
        key: 'ArrowRight',
      });

      expect(handlersById.swords.onSizeChange).toHaveBeenCalledWith(105);
    });
  });

  describe('upload', () => {
    it('calls onUpload with the picked file', () => {
      const { handlersById } = renderEditor();
      const file = new File(['png-bytes'], 'swords.png', { type: 'image/png' });

      fireEvent.change(within(rowFor('Swords')).getByLabelText('Upload image'), { target: { files: [file] } });

      expect(handlersById.swords.onUpload).toHaveBeenCalledWith(file);
    });

    it('does not call onUpload when the file picker yields no file', () => {
      const { handlersById } = renderEditor();

      fireEvent.change(within(rowFor('Swords')).getByLabelText('Upload image'), { target: { files: [] } });

      expect(handlersById.swords.onUpload).not.toHaveBeenCalled();
    });

    it('shows "Uploading…" and disables the file input while the row is uploading', () => {
      renderEditor({ uploadStates: { swords: { isUploading: true, error: null } } });
      const row = within(rowFor('Swords'));

      expect(row.getByLabelText('Uploading…')).toBeDisabled();
      expect(row.queryByLabelText('Upload image')).not.toBeInTheDocument();
    });

    it('enables the file input when the row is not uploading', () => {
      renderEditor();

      expect(within(rowFor('Swords')).getByLabelText('Upload image')).toBeEnabled();
    });

    it('shows the upload error text only on the row that failed', () => {
      renderEditor({ uploadStates: { swords: { isUploading: false, error: 'boom' } } });

      expect(within(rowFor('Swords')).getByText(UPLOAD_ERROR_TEXT)).toBeInTheDocument();
      expect(within(rowFor('Info')).queryByText(UPLOAD_ERROR_TEXT)).not.toBeInTheDocument();
    });
  });

  describe('reset', () => {
    it('calls onReset only for the overridden row whose Reset button was clicked', () => {
      const { handlersById } = renderEditor();

      fireEvent.click(within(rowFor('Info')).getByRole('button', { name: 'Reset to default' }));

      expect(handlersById.info.onReset).toHaveBeenCalledTimes(1);
      expect(handlersById.swords.onReset).not.toHaveBeenCalled();
    });
  });

  describe('header save button and status', () => {
    it('is enabled when there are unsaved changes and calls onSave on click', () => {
      const { onSave } = renderEditor({ isDirty: true });
      const saveButton = screen.getByRole('button', { name: 'Save' });

      expect(saveButton).toBeEnabled();
      fireEvent.click(saveButton);

      expect(onSave).toHaveBeenCalledTimes(1);
    });

    it('is disabled when there are no unsaved changes', () => {
      renderEditor({ isDirty: false });

      expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
    });

    it('is disabled and shows a spinner while saving, even when dirty', () => {
      renderEditor({ isDirty: true, status: 'saving' });

      expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
      expect(screen.getByTestId('lucide-icon-loader2')).toBeInTheDocument();
    });

    it('shows "Saved." after a successful save', () => {
      renderEditor({ status: 'saved' });

      expect(screen.getByRole('status')).toHaveTextContent('Saved.');
    });

    it('shows the failure message after a failed save', () => {
      renderEditor({ status: 'error' });

      expect(screen.getByRole('status')).toHaveTextContent(SAVE_FAILED_TEXT);
    });

    it('shows no status text when idle', () => {
      renderEditor({ status: 'idle' });

      expect(screen.getByRole('status')).toBeEmptyDOMElement();
    });
  });

  describe('header', () => {
    it('renders the editor title as a level-2 heading', () => {
      renderEditor();

      expect(screen.getByRole('heading', { level: 2, name: 'Icon Editor' })).toBeInTheDocument();
    });
  });
});

describe('IconEditor (connected)', () => {
  it('renders the view model returned by useIconEditor', () => {
    const viewModel: IconEditorViewModel = {
      isLoading: false,
      moduleGroups: toModuleGroups(sampleIconRegistry, {}, {}, {}, () => ({
        onRotationChange: jest.fn(),
        onSizeChange: jest.fn(),
        onUpload: jest.fn(),
        onReset: jest.fn(),
      })),
      isDirty: false,
      status: 'idle',
      onSave: jest.fn(),
    };
    jest.mocked(useIconEditor).mockReturnValue(viewModel);

    render(<IconEditor />);

    expect(screen.getByRole('heading', { name: 'Icon Editor' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /hud/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
  });
});
