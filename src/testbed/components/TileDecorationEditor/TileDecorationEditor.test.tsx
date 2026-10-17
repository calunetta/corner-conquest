import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { TileDecorationEditor, TileDecorationEditorView } from './TileDecorationEditor';
import { applyDragToDraft, applySharedCornerSizeToDraft } from './TileDecorationEditor.defaultElements.edit.map';
import type { DefaultElementsEditorState } from './TileDecorationEditor.defaultElements.hook';
import { DEFAULT_ELEMENT_ROWS, toIslandTileSlotsDraft, toSlotsForRow } from './TileDecorationEditor.defaultElements.map';
import { useTileDecorationEditor } from './TileDecorationEditor.hook';
import { sampleDecorationImages, sampleDecorationLayoutsConfig } from './TileDecorationEditor.fixtures';
import { toScenarioOptions } from './TileDecorationEditor.map';
import type { TileDecorationEditorViewModel } from './TileDecorationEditor.types';
import type { DefaultElementRowMeta } from './TileDecorationEditor.defaultElements.types';

jest.mock('next/image', () => ({
  __esModule: true,
  default: ({ src, alt, className }: { src: string; alt: string; className?: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} className={className} />
  ),
}));

jest.mock('./TileDecorationEditor.hook', () => ({ useTileDecorationEditor: jest.fn() }));

const BASE_IMAGE = sampleDecorationImages[0];
const FIRST_BASE_INSTANCE_ID = 'base-default-0';
const EMPTY_HINT = 'No decorations — pick an image to add one';
const SAVE_WARNING_TEXT = 'Saving writes directly to island-tile-slots.types.ts.';

const KNIGHT_ROW = DEFAULT_ELEMENT_ROWS.find((row) => row.id === 'knight') as DefaultElementRowMeta;
const CREST_ROW = DEFAULT_ELEMENT_ROWS.find((row) => row.id === 'crest') as DefaultElementRowMeta;

function findRow(rowId: string): DefaultElementRowMeta {
  const row = DEFAULT_ELEMENT_ROWS.find((candidate) => candidate.id === rowId);
  if (!row) throw new Error(`Unknown default-element row id in test fixture: ${rowId}`);
  return row;
}

/** A Default-elements sub-state with every handler a jest.fn, defaulting to the real Knight row
 *  built from the real draft/slots so tests exercise the actual toSlotsForRow/draft shape rather
 *  than an invented one. */
function createDefaultElementsState(overrides: Partial<DefaultElementsEditorState> = {}): DefaultElementsEditorState {
  const draft = overrides.draft ?? toIslandTileSlotsDraft();
  const activeRow = overrides.activeRow ?? KNIGHT_ROW;
  const slots = overrides.slots ?? toSlotsForRow(activeRow, draft);
  return {
    draft,
    activeRowId: activeRow.id,
    activeRow,
    slots,
    selectedSlotId: null,
    isDirty: false,
    status: 'idle',
    onSelectRow: jest.fn(),
    onSelectSlot: jest.fn(),
    onDragSlot: jest.fn(),
    onNudgeSlot: jest.fn(),
    onResizeSharedCornerSize: jest.fn(),
    onResizeSlot: jest.fn(),
    onResizeCrest: jest.fn(),
    onSave: jest.fn(),
    clearSelection: jest.fn(),
    ...overrides,
  };
}

/** A view model for the Base scenario, with every handler a jest.fn so each test can assert calls. */
function createViewModel(overrides: Partial<TileDecorationEditorViewModel> = {}): TileDecorationEditorViewModel {
  return {
    mode: 'decorations',
    onModeChange: jest.fn(),
    defaultElements: createDefaultElementsState(),
    scenarioOptions: toScenarioOptions(),
    artOptions: [{ id: 'default', label: 'Default' }],
    artVariantId: 'default',
    onArtVariantChange: jest.fn(),
    activeScenario: 'base',
    activeVariant: null,
    layouts: sampleDecorationLayoutsConfig.base,
    activeLayoutId: 'base-default',
    selectedInstanceId: null,
    images: sampleDecorationImages,
    isDirty: false,
    status: 'idle',
    canDeleteActiveLayout: true,
    onScenarioChange: jest.fn(),
    onVariantChange: jest.fn(),
    onSelectLayout: jest.fn(),
    onAddLayout: jest.fn(),
    onDuplicateLayout: jest.fn(),
    onRenameLayout: jest.fn(),
    onDeleteLayout: jest.fn(),
    onAddInstance: jest.fn(),
    onSelectInstance: jest.fn(),
    onDragInstance: jest.fn(),
    onNudgeInstance: jest.fn(),
    onResizeInstance: jest.fn(),
    onRelayerInstance: jest.fn(),
    onRemoveInstance: jest.fn(),
    onSave: jest.fn(),
    ...overrides,
  };
}

/** jsdom 26 has no PointerEvent, so a plain Event carries clientX/clientY/pointerId for React. */
function firePointer(element: Element, type: 'pointerdown' | 'pointermove' | 'pointerup', init: { clientX: number; clientY: number }) {
  const event = Object.assign(new Event(type, { bubbles: true }), { pointerId: 1, ...init });
  fireEvent(element, event);
}

function getSprites() {
  return screen.getAllByTestId('tile-decoration-editor-sprite');
}

/** Gives the sprite's parent (the decoration overlay, which percentages are measured against) a
 *  200x200 box at the origin, and stubs the pointer-capture call jsdom does not implement. */
/** The sprite's own box, centred on (centreX, centreY), so the grab offset is known in these tests. */
function mockSpriteCentre(sprite: HTMLElement, centreX: number, centreY: number) {
  jest.spyOn(sprite, 'getBoundingClientRect').mockReturnValue({
    top: centreY - 20,
    left: centreX - 20,
    width: 40,
    height: 40,
    right: centreX + 20,
    bottom: centreY + 20,
    x: centreX - 20,
    y: centreY - 20,
    toJSON: () => ({}),
  } as DOMRect);
}

function mockCanvasBox(sprite: HTMLElement) {
  const overlay = sprite.parentElement as HTMLElement;
  jest.spyOn(overlay, 'getBoundingClientRect').mockReturnValue({
    top: 0,
    left: 0,
    width: 200,
    height: 200,
    right: 200,
    bottom: 200,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  } as DOMRect);
  Object.assign(sprite, { setPointerCapture: jest.fn() });
}

describe('TileDecorationEditorView', () => {
  describe('canvas and decorations', () => {
    it('renders one draggable decoration per instance of the active layout, labelled by position and file name', () => {
      render(<TileDecorationEditorView {...createViewModel()} />);

      const sprites = screen.getAllByRole('button', { name: /^Decoration \d of 2, / });
      expect(sprites.map((sprite) => sprite.getAttribute('aria-label'))).toEqual([
        'Decoration 1 of 2, pine_tree.gif',
        'Decoration 2 of 2, spring_tree.gif',
      ]);
    });

    it('shows no empty-layout hint while the layout has decorations', () => {
      render(<TileDecorationEditorView {...createViewModel()} />);

      expect(screen.queryByText(EMPTY_HINT)).not.toBeInTheDocument();
    });

    it('shows the empty-layout hint and no sprites for a layout with zero instances', () => {
      render(
        <TileDecorationEditorView
          {...createViewModel({
            activeScenario: 'empty',
            activeVariant: 'empty-3',
            layouts: sampleDecorationLayoutsConfig['empty-3'],
            activeLayoutId: 'empty-3-default',
          })}
        />,
      );

      expect(screen.getByText(EMPTY_HINT)).toBeInTheDocument();
      expect(screen.queryAllByTestId('tile-decoration-editor-sprite')).toHaveLength(0);
    });

    it('marks the selected decoration as pressed and no other', () => {
      render(
        <TileDecorationEditorView {...createViewModel({ selectedInstanceId: 'base-default-1' })} />,
      );

      expect(screen.getByRole('button', { name: /^Decoration 2 of 2/, pressed: true })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /^Decoration 1 of 2/, pressed: false })).toBeInTheDocument();
    });

    it('selects a decoration when it is pressed with the pointer', () => {
      const viewModel = createViewModel();
      render(<TileDecorationEditorView {...viewModel} />);
      const sprite = getSprites()[0];
      mockCanvasBox(sprite);

      firePointer(sprite, 'pointerdown', { clientX: 10, clientY: 10 });

      expect(viewModel.onSelectInstance).toHaveBeenCalledWith(FIRST_BASE_INSTANCE_ID);
    });

    it('drags a decoration to the pointer position as a percentage of the canvas box', () => {
      const viewModel = createViewModel();
      render(<TileDecorationEditorView {...viewModel} />);
      const sprite = getSprites()[0];
      mockCanvasBox(sprite);
      mockSpriteCentre(sprite, 100, 100);

      firePointer(sprite, 'pointerdown', { clientX: 100, clientY: 100 });
      firePointer(sprite, 'pointermove', { clientX: 150, clientY: 50 });
      firePointer(sprite, 'pointerup', { clientX: 150, clientY: 50 });

      expect(viewModel.onDragInstance).toHaveBeenLastCalledWith(FIRST_BASE_INSTANCE_ID, 25, 75);
    });

    it('moves the decoration by the pointer distance when grabbed off its centre, without jumping', () => {
      const viewModel = createViewModel();
      render(<TileDecorationEditorView {...viewModel} />);
      const sprite = getSprites()[0];
      mockCanvasBox(sprite);
      mockSpriteCentre(sprite, 100, 100);

      // Grabbed 10px right of the centre: the centre should end up 10px right of the pointer.
      firePointer(sprite, 'pointerdown', { clientX: 110, clientY: 100 });
      firePointer(sprite, 'pointermove', { clientX: 150, clientY: 50 });

      expect(viewModel.onDragInstance).toHaveBeenLastCalledWith(FIRST_BASE_INSTANCE_ID, 25, 70);
    });

    it('clamps a dragged decoration to the canvas edges', () => {
      const viewModel = createViewModel();
      render(<TileDecorationEditorView {...viewModel} />);
      const sprite = getSprites()[0];
      mockCanvasBox(sprite);

      firePointer(sprite, 'pointerdown', { clientX: 100, clientY: 100 });
      firePointer(sprite, 'pointermove', { clientX: 400, clientY: -50 });

      expect(viewModel.onDragInstance).toHaveBeenLastCalledWith(FIRST_BASE_INSTANCE_ID, 0, 100);
    });

    it('treats a press that moves 4px or less as a click, not a drag', () => {
      const viewModel = createViewModel();
      render(<TileDecorationEditorView {...viewModel} />);
      const sprite = getSprites()[0];
      mockCanvasBox(sprite);

      firePointer(sprite, 'pointerdown', { clientX: 100, clientY: 100 });
      firePointer(sprite, 'pointermove', { clientX: 102, clientY: 101 });
      firePointer(sprite, 'pointerup', { clientX: 102, clientY: 101 });

      expect(viewModel.onDragInstance).not.toHaveBeenCalled();
    });

    it('stops dragging once the pointer is released', () => {
      const viewModel = createViewModel();
      render(<TileDecorationEditorView {...viewModel} />);
      const sprite = getSprites()[0];
      mockCanvasBox(sprite);

      firePointer(sprite, 'pointerdown', { clientX: 100, clientY: 100 });
      firePointer(sprite, 'pointerup', { clientX: 100, clientY: 100 });
      firePointer(sprite, 'pointermove', { clientX: 150, clientY: 150 });

      expect(viewModel.onDragInstance).not.toHaveBeenCalled();
    });

    it.each([
      ['ArrowUp', false, -1, 0],
      ['ArrowDown', false, 1, 0],
      ['ArrowLeft', false, 0, -1],
      ['ArrowRight', false, 0, 1],
      ['ArrowRight', true, 0, 5],
      ['ArrowUp', true, -5, 0],
    ])('nudges the focused decoration on %s (shift: %s) by %d/%d percent', (key, shiftKey, dTop, dLeft) => {
      const viewModel = createViewModel();
      render(<TileDecorationEditorView {...viewModel} />);

      fireEvent.keyDown(getSprites()[0], { key, shiftKey });

      expect(viewModel.onNudgeInstance).toHaveBeenCalledWith(FIRST_BASE_INSTANCE_ID, dTop, dLeft);
    });

    it('ignores keys that are not arrows', () => {
      const viewModel = createViewModel();
      render(<TileDecorationEditorView {...viewModel} />);

      fireEvent.keyDown(getSprites()[0], { key: 'a' });

      expect(viewModel.onNudgeInstance).not.toHaveBeenCalled();
    });

    // Regression guard: keyboard activation fires a click, so the sprite's click handler must select
    // the decoration. Without it, keyboard users cannot reach the inspector for that decoration.
    it('selects a decoration when it is activated from the keyboard (click event)', () => {
      const viewModel = createViewModel();
      render(<TileDecorationEditorView {...viewModel} />);

      fireEvent.click(getSprites()[0]);

      expect(viewModel.onSelectInstance).toHaveBeenCalledWith(FIRST_BASE_INSTANCE_ID);
    });
  });

  describe('image picker and inspector', () => {
    it('adds a decoration with the picked image when an image thumbnail is clicked', () => {
      const viewModel = createViewModel();
      render(<TileDecorationEditorView {...viewModel} />);

      fireEvent.click(screen.getByRole('button', { name: 'Add pine_tree.gif' }));

      expect(viewModel.onAddInstance).toHaveBeenCalledWith(BASE_IMAGE);
    });

    it('lists one thumbnail per discovered image', () => {
      render(<TileDecorationEditorView {...createViewModel()} />);

      expect(screen.getAllByRole('button', { name: /^Add \S+\.gif$/ })).toHaveLength(sampleDecorationImages.length);
    });

    it('shows the no-images message when the image folder is empty', () => {
      render(<TileDecorationEditorView {...createViewModel({ images: [] })} />);

      expect(screen.getByText('No images in public/sprites/decorations/ yet.')).toBeInTheDocument();
      expect(screen.queryAllByRole('button', { name: /^Add \S+\.gif$/ })).toHaveLength(0);
    });

    it('shows the no-selection placeholder and no size or layer fields when nothing is selected', () => {
      render(<TileDecorationEditorView {...createViewModel()} />);

      expect(screen.getByText('Click a decoration on the tile to edit it.')).toBeInTheDocument();
      expect(screen.queryByRole('spinbutton', { name: 'Size (% of tile)' })).not.toBeInTheDocument();
    });

    it('fills the size, layer and position readout from the selected decoration', () => {
      render(<TileDecorationEditorView {...createViewModel({ selectedInstanceId: FIRST_BASE_INSTANCE_ID })} />);

      expect(screen.getByRole('spinbutton', { name: 'Size (% of tile)' })).toHaveValue(15);
      expect(screen.getByRole('spinbutton', { name: 'Layer (z-index)' })).toHaveValue(10);
      expect(screen.getByText('Top 36.5%, left 44.5%')).toBeInTheDocument();
    });

    it('resizes the selected decoration from the size field', () => {
      const viewModel = createViewModel({ selectedInstanceId: FIRST_BASE_INSTANCE_ID });
      render(<TileDecorationEditorView {...viewModel} />);

      fireEvent.change(screen.getByRole('spinbutton', { name: 'Size (% of tile)' }), { target: { value: '40' } });

      expect(viewModel.onResizeInstance).toHaveBeenCalledWith(FIRST_BASE_INSTANCE_ID, 40);
    });

    it('re-layers the selected decoration from the layer field', () => {
      const viewModel = createViewModel({ selectedInstanceId: FIRST_BASE_INSTANCE_ID });
      render(<TileDecorationEditorView {...viewModel} />);

      fireEvent.change(screen.getByRole('spinbutton', { name: 'Layer (z-index)' }), { target: { value: '30' } });

      expect(viewModel.onRelayerInstance).toHaveBeenCalledWith(FIRST_BASE_INSTANCE_ID, 30);
    });

    it('removes the selected decoration when Remove is clicked', () => {
      const viewModel = createViewModel({ selectedInstanceId: FIRST_BASE_INSTANCE_ID });
      render(<TileDecorationEditorView {...viewModel} />);

      fireEvent.click(screen.getByRole('button', { name: 'Remove' }));

      expect(viewModel.onRemoveInstance).toHaveBeenCalledWith(FIRST_BASE_INSTANCE_ID);
    });
  });

  describe('scenario and layout rail', () => {
    it('shows the active scenario and no variant picker for Base', () => {
      render(<TileDecorationEditorView {...createViewModel()} />);

      expect(screen.getByRole('combobox', { name: 'Scenario' })).toHaveTextContent('Base');
      expect(screen.queryByRole('combobox', { name: 'Variant' })).not.toBeInTheDocument();
    });

    it('shows the variant picker with the active variant for a scenario that has one', () => {
      render(
        <TileDecorationEditorView
          {...createViewModel({
            activeScenario: 'monster',
            activeVariant: 'monster-cleared',
            layouts: sampleDecorationLayoutsConfig['monster-cleared'],
            activeLayoutId: 'monster-cleared-default',
          })}
        />,
      );

      expect(screen.getByRole('combobox', { name: 'Variant' })).toHaveTextContent('Cleared');
    });

    it('lists every layout of the active scenario and marks the active one as current', () => {
      render(
        <TileDecorationEditorView
          {...createViewModel({
            activeScenario: 'empty',
            activeVariant: 'empty-2',
            layouts: sampleDecorationLayoutsConfig['empty-2'],
            activeLayoutId: 'empty-2-alt',
          })}
        />,
      );

      expect(screen.getByRole('button', { name: 'Default' })).not.toHaveAttribute('aria-current');
      expect(screen.getByRole('button', { name: 'Clustered' })).toHaveAttribute('aria-current', 'true');
    });

    it('selects a layout when its row is clicked', () => {
      const viewModel = createViewModel({
        activeScenario: 'empty',
        activeVariant: 'empty-2',
        layouts: sampleDecorationLayoutsConfig['empty-2'],
        activeLayoutId: 'empty-2-default',
      });
      render(<TileDecorationEditorView {...viewModel} />);

      fireEvent.click(screen.getByRole('button', { name: 'Clustered' }));

      expect(viewModel.onSelectLayout).toHaveBeenCalledWith('empty-2-alt');
    });

    it('shows the Unsaved changes badge only while the layout has unsaved edits', () => {
      const { rerender } = render(<TileDecorationEditorView {...createViewModel()} />);
      expect(screen.queryByText('Unsaved changes')).not.toBeInTheDocument();

      rerender(<TileDecorationEditorView {...createViewModel({ isDirty: true })} />);
      expect(screen.getByText('Unsaved changes')).toBeInTheDocument();
    });

    it('disables Add layout, Duplicate and Delete while there are unsaved edits', () => {
      render(<TileDecorationEditorView {...createViewModel({ isDirty: true })} />);

      expect(screen.getByRole('button', { name: 'Add layout' })).toBeDisabled();
      expect(screen.getByRole('button', { name: 'Duplicate' })).toBeDisabled();
      expect(screen.getByRole('button', { name: 'Delete' })).toBeDisabled();
    });

    it('enables Add layout and Duplicate when there are no unsaved edits', () => {
      render(<TileDecorationEditorView {...createViewModel()} />);

      expect(screen.getByRole('button', { name: 'Add layout' })).toBeEnabled();
      expect(screen.getByRole('button', { name: 'Duplicate' })).toBeEnabled();
    });

    it('duplicates the active layout when Duplicate is clicked', () => {
      const viewModel = createViewModel();
      render(<TileDecorationEditorView {...viewModel} />);

      fireEvent.click(screen.getByRole('button', { name: 'Duplicate' }));

      expect(viewModel.onDuplicateLayout).toHaveBeenCalledTimes(1);
    });

    it('adds a layout with the trimmed name typed into the inline field on Enter', () => {
      const viewModel = createViewModel();
      render(<TileDecorationEditorView {...viewModel} />);

      fireEvent.click(screen.getByRole('button', { name: 'Add layout' }));
      const nameField = screen.getByRole('textbox', { name: 'New layout name' });
      fireEvent.change(nameField, { target: { value: '  Ring  ' } });
      fireEvent.keyDown(nameField, { key: 'Enter' });

      expect(viewModel.onAddLayout).toHaveBeenCalledWith('Ring');
      expect(screen.queryByRole('textbox', { name: 'New layout name' })).not.toBeInTheDocument();
    });

    it('does not add a layout for a blank name, and keeps the field open', () => {
      const viewModel = createViewModel();
      render(<TileDecorationEditorView {...viewModel} />);

      fireEvent.click(screen.getByRole('button', { name: 'Add layout' }));
      const nameField = screen.getByRole('textbox', { name: 'New layout name' });
      fireEvent.change(nameField, { target: { value: '   ' } });
      fireEvent.keyDown(nameField, { key: 'Enter' });

      expect(viewModel.onAddLayout).not.toHaveBeenCalled();
      expect(screen.getByRole('textbox', { name: 'New layout name' })).toBeInTheDocument();
    });

    it('cancels adding a layout on Escape without calling onAddLayout', () => {
      const viewModel = createViewModel();
      render(<TileDecorationEditorView {...viewModel} />);

      fireEvent.click(screen.getByRole('button', { name: 'Add layout' }));
      fireEvent.keyDown(screen.getByRole('textbox', { name: 'New layout name' }), { key: 'Escape' });

      expect(viewModel.onAddLayout).not.toHaveBeenCalled();
      expect(screen.queryByRole('textbox', { name: 'New layout name' })).not.toBeInTheDocument();
    });

    it('pre-fills the rename field with the active layout name and renames on Enter', () => {
      const viewModel = createViewModel();
      render(<TileDecorationEditorView {...viewModel} />);

      fireEvent.click(screen.getByRole('button', { name: 'Rename' }));
      const nameField = screen.getByRole('textbox', { name: 'Layout name' });
      expect(nameField).toHaveValue('Default');

      fireEvent.change(nameField, { target: { value: 'Renamed' } });
      fireEvent.keyDown(nameField, { key: 'Enter' });

      expect(viewModel.onRenameLayout).toHaveBeenCalledWith('Renamed');
    });

    it('cancels renaming on Escape without calling onRenameLayout', () => {
      const viewModel = createViewModel();
      render(<TileDecorationEditorView {...viewModel} />);

      fireEvent.click(screen.getByRole('button', { name: 'Rename' }));
      fireEvent.keyDown(screen.getByRole('textbox', { name: 'Layout name' }), { key: 'Escape' });

      expect(viewModel.onRenameLayout).not.toHaveBeenCalled();
      expect(screen.getByRole('button', { name: 'Rename' })).toBeInTheDocument();
    });

    it('disables Delete with the single-layout reason as its accessible description when it is the last layout', () => {
      render(<TileDecorationEditorView {...createViewModel({ canDeleteActiveLayout: false })} />);

      const deleteButton = screen.getByRole('button', { name: 'Delete' });
      expect(deleteButton).toBeDisabled();
      expect(deleteButton).toHaveAccessibleDescription('A scenario needs at least one layout');
    });

    it('enables Delete without a description when the scenario has another layout to fall back to', () => {
      render(<TileDecorationEditorView {...createViewModel({ canDeleteActiveLayout: true })} />);

      const deleteButton = screen.getByRole('button', { name: 'Delete' });
      expect(deleteButton).toBeEnabled();
      expect(deleteButton).not.toHaveAccessibleDescription();
    });

    it('asks for confirmation before deleting, and deletes only when confirmed', () => {
      const viewModel = createViewModel({
        activeScenario: 'empty',
        activeVariant: 'empty-2',
        layouts: sampleDecorationLayoutsConfig['empty-2'],
        activeLayoutId: 'empty-2-alt',
      });
      render(<TileDecorationEditorView {...viewModel} />);

      fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
      const dialog = screen.getByRole('alertdialog', { name: 'Delete this layout?' });
      expect(within(dialog).getByText(/"Clustered" from Empty permanently once you save\./)).toBeInTheDocument();
      expect(viewModel.onDeleteLayout).not.toHaveBeenCalled();

      fireEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));

      expect(viewModel.onDeleteLayout).toHaveBeenCalledTimes(1);
    });

    it('does not delete when the confirmation is cancelled', () => {
      const viewModel = createViewModel({
        activeScenario: 'empty',
        activeVariant: 'empty-2',
        layouts: sampleDecorationLayoutsConfig['empty-2'],
        activeLayoutId: 'empty-2-alt',
      });
      render(<TileDecorationEditorView {...viewModel} />);

      fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
      const dialog = screen.getByRole('alertdialog', { name: 'Delete this layout?' });
      fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));

      expect(viewModel.onDeleteLayout).not.toHaveBeenCalled();
    });
  });

  describe('save', () => {
    it('disables Save when there are no unsaved edits', () => {
      render(<TileDecorationEditorView {...createViewModel()} />);

      expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
    });

    it('calls onSave when Save is clicked with unsaved edits', () => {
      const viewModel = createViewModel({ isDirty: true });
      render(<TileDecorationEditorView {...viewModel} />);

      fireEvent.click(screen.getByRole('button', { name: 'Save' }));

      expect(viewModel.onSave).toHaveBeenCalledTimes(1);
    });

    it('disables Save and shows a spinner while the save is in flight', () => {
      render(<TileDecorationEditorView {...createViewModel({ isDirty: true, status: 'saving' })} />);

      expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
      expect(screen.getByTestId('lucide-icon-loader2')).toBeInTheDocument();
    });

    it('confirms with "Saved." when the save succeeded', () => {
      render(<TileDecorationEditorView {...createViewModel({ status: 'saved' })} />);

      expect(screen.getByRole('status')).toHaveTextContent('Saved.');
    });

    it('reports a failed save and keeps the edits to retry', () => {
      render(<TileDecorationEditorView {...createViewModel({ isDirty: true, status: 'error' })} />);

      expect(screen.getByRole('status')).toHaveTextContent('Could not save — see console.');
      expect(screen.getByText('Unsaved changes')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled();
    });

    it('shows no status text while idle', () => {
      render(<TileDecorationEditorView {...createViewModel()} />);

      expect(screen.getByRole('status')).toHaveTextContent('');
    });
  });

  describe('default elements mode', () => {
    // Radix's TabsTrigger activates on pointer press (onMouseDown), not on the synthesized click
    // fireEvent.click produces, so these simulate a real left-button mouse-down.
    it('switches to Default elements mode via the mode tab', () => {
      const viewModel = createViewModel();
      render(<TileDecorationEditorView {...viewModel} />);

      fireEvent.mouseDown(screen.getByRole('tab', { name: 'Default elements' }), { button: 0 });

      expect(viewModel.onModeChange).toHaveBeenCalledWith('default-elements');
    });

    it('switches back to Decorations mode via the mode tab', () => {
      const viewModel = createViewModel({ mode: 'default-elements' });
      render(<TileDecorationEditorView {...viewModel} />);

      fireEvent.mouseDown(screen.getByRole('tab', { name: 'Decorations' }), { button: 0 });

      expect(viewModel.onModeChange).toHaveBeenCalledWith('decorations');
    });

    it('shows the Decorations rail (Scenario picker) and no element list when mode is decorations', () => {
      render(<TileDecorationEditorView {...createViewModel()} />);

      expect(screen.getByRole('combobox', { name: 'Scenario' })).toBeInTheDocument();
      expect(screen.queryByRole('heading', { name: 'Default elements' })).not.toBeInTheDocument();
    });

    it('replaces the Scenario/Variant/Layouts rail with the element list when mode is default-elements', () => {
      render(<TileDecorationEditorView {...createViewModel({ mode: 'default-elements' })} />);

      expect(screen.queryByRole('combobox', { name: 'Scenario' })).not.toBeInTheDocument();
      expect(screen.queryByRole('combobox', { name: 'Variant' })).not.toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Default elements' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Knight (all corners)' })).toHaveAttribute('aria-current', 'true');
      expect(screen.getByRole('button', { name: 'Boat (all corners)' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Player crest' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Resource slots (base)' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Idle art' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '1 resource node' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '4 resource nodes' })).toBeInTheDocument();
    });

    it('selects a different row when its rail button is clicked', () => {
      const defaultElements = createDefaultElementsState();
      render(<TileDecorationEditorView {...createViewModel({ mode: 'default-elements', defaultElements })} />);

      fireEvent.click(screen.getByRole('button', { name: 'Boat (all corners)' }));

      expect(defaultElements.onSelectRow).toHaveBeenCalledWith('boat');
    });

    it.each([
      ['knight', 4],
      ['boat', 4],
      ['crest', 0],
      ['base-resources', 3],
      ['special-art', 1],
      ['resource-1', 1],
      ['resource-2', 2],
      ['resource-3', 3],
      ['resource-4', 4],
    ])('renders %s sprite(s) for the "%s" row', (rowId, expectedCount) => {
      const row = findRow(rowId);
      const draft = toIslandTileSlotsDraft();
      const slots = toSlotsForRow(row, draft);
      render(
        <TileDecorationEditorView
          {...createViewModel({
            mode: 'default-elements',
            defaultElements: createDefaultElementsState({ draft, activeRow: row, slots }),
          })}
        />,
      );

      expect(screen.queryAllByTestId('tile-decoration-editor-sprite')).toHaveLength(expectedCount);
    });

    it('renders no draggable sprite and the "Centered — size only" badge for the Player crest row', () => {
      const draft = toIslandTileSlotsDraft();
      render(
        <TileDecorationEditorView
          {...createViewModel({
            mode: 'default-elements',
            defaultElements: createDefaultElementsState({ draft, activeRow: CREST_ROW, slots: [] }),
          })}
        />,
      );

      expect(screen.queryAllByTestId('tile-decoration-editor-sprite')).toHaveLength(0);
      expect(screen.getByText('Centered — size only')).toBeInTheDocument();
    });

    it('shows exactly the Size (% of tile) and Minimum size (px) fields, with no position readout, for Player crest', () => {
      const draft = toIslandTileSlotsDraft();
      render(
        <TileDecorationEditorView
          {...createViewModel({
            mode: 'default-elements',
            defaultElements: createDefaultElementsState({ draft, activeRow: CREST_ROW, slots: [] }),
          })}
        />,
      );

      expect(screen.getByRole('spinbutton', { name: 'Size (% of tile)' })).toHaveValue(draft.baseCrestSize);
      expect(screen.getByRole('spinbutton', { name: 'Minimum size (px)' })).toHaveValue(draft.baseCrestMinPx);
      expect(screen.getAllByRole('spinbutton')).toHaveLength(2);
      expect(screen.queryByText(/^Top /)).not.toBeInTheDocument();
      expect(screen.queryByText('Click a decoration on the tile to edit it.')).not.toBeInTheDocument();
    });

    it('changing the shared Size field while a corner is selected calls onResizeSharedCornerSize, not a per-corner resize', () => {
      const draft = toIslandTileSlotsDraft();
      const slots = toSlotsForRow(KNIGHT_ROW, draft);
      const trCorner = slots.find((slot) => slot.id === 'tr');
      if (!trCorner) throw new Error('fixture must contain a tr corner slot');
      const defaultElements = createDefaultElementsState({ draft, activeRow: KNIGHT_ROW, slots, selectedSlotId: trCorner.id });
      render(<TileDecorationEditorView {...createViewModel({ mode: 'default-elements', defaultElements })} />);

      fireEvent.change(screen.getByRole('spinbutton', { name: 'Size (applies to all 4 corners)' }), {
        target: { value: '50' },
      });

      expect(defaultElements.onResizeSharedCornerSize).toHaveBeenCalledWith(50);
    });

    it('resizing the shared corner size renders all 4 corner sprites at the same new width/height', () => {
      const draft = toIslandTileSlotsDraft();
      const resizedDraft = applySharedCornerSizeToDraft('knight', 50, draft);
      const slots = toSlotsForRow(KNIGHT_ROW, resizedDraft);
      render(
        <TileDecorationEditorView
          {...createViewModel({
            mode: 'default-elements',
            defaultElements: createDefaultElementsState({ draft: resizedDraft, activeRow: KNIGHT_ROW, slots }),
          })}
        />,
      );

      const sprites = screen.getAllByTestId('tile-decoration-editor-sprite');
      expect(sprites).toHaveLength(4);
      sprites.forEach((sprite) => {
        expect(sprite.style.width).toBe('50%');
        expect(sprite.style.height).toBe('50%');
      });
    });

    it('calls onDragSlot with the dragged corner\'s own id and the pointer position as a percentage of the canvas box', () => {
      const draft = toIslandTileSlotsDraft();
      const slots = toSlotsForRow(KNIGHT_ROW, draft);
      const trIndex = slots.findIndex((slot) => slot.id === 'tr');
      const defaultElements = createDefaultElementsState({ draft, activeRow: KNIGHT_ROW, slots });
      render(<TileDecorationEditorView {...createViewModel({ mode: 'default-elements', defaultElements })} />);
      const sprite = screen.getAllByTestId('tile-decoration-editor-sprite')[trIndex];
      mockCanvasBox(sprite);
      mockSpriteCentre(sprite, 100, 100);

      firePointer(sprite, 'pointerdown', { clientX: 100, clientY: 100 });
      firePointer(sprite, 'pointermove', { clientX: 150, clientY: 50 });

      expect(defaultElements.onDragSlot).toHaveBeenLastCalledWith('tr', 25, 75);
    });

    it('dragging one knight corner leaves the other 3 corners\' rendered position and size unchanged', () => {
      const draft = toIslandTileSlotsDraft();
      const beforeSlots = toSlotsForRow(KNIGHT_ROW, draft);
      const trBefore = beforeSlots.find((slot) => slot.id === 'tr');
      if (!trBefore) throw new Error('fixture must contain a tr corner slot');

      const { rerender } = render(
        <TileDecorationEditorView
          {...createViewModel({
            mode: 'default-elements',
            defaultElements: createDefaultElementsState({ draft, activeRow: KNIGHT_ROW, slots: beforeSlots, selectedSlotId: 'tr' }),
          })}
        />,
      );
      const otherStylesBefore = screen
        .getAllByTestId('tile-decoration-editor-sprite')
        .filter((sprite) => sprite.getAttribute('aria-label') !== trBefore.ariaLabel)
        .map((sprite) => sprite.getAttribute('style'));

      const draggedDraft = applyDragToDraft(KNIGHT_ROW, 'tr', 10, 20, draft);
      const afterSlots = toSlotsForRow(KNIGHT_ROW, draggedDraft);
      const trAfter = afterSlots.find((slot) => slot.id === 'tr');
      if (!trAfter) throw new Error('fixture must contain a tr corner slot');
      // Sanity: the dragged corner's own style actually changed, proving the next assertion is
      // not vacuously true because nothing moved.
      expect(trAfter.style).not.toEqual(trBefore.style);

      rerender(
        <TileDecorationEditorView
          {...createViewModel({
            mode: 'default-elements',
            defaultElements: createDefaultElementsState({
              draft: draggedDraft,
              activeRow: KNIGHT_ROW,
              slots: afterSlots,
              selectedSlotId: 'tr',
            }),
          })}
        />,
      );
      const otherStylesAfter = screen
        .getAllByTestId('tile-decoration-editor-sprite')
        .filter((sprite) => sprite.getAttribute('aria-label') !== trBefore.ariaLabel)
        .map((sprite) => sprite.getAttribute('style'));

      expect(otherStylesAfter).toEqual(otherStylesBefore);
    });

    it('resizes a selected resource node independently through onResizeSlot', () => {
      const row = findRow('resource-3');
      const draft = toIslandTileSlotsDraft();
      const slots = toSlotsForRow(row, draft);
      const secondNode = slots[1];
      const defaultElements = createDefaultElementsState({ draft, activeRow: row, slots, selectedSlotId: secondNode.id });
      render(<TileDecorationEditorView {...createViewModel({ mode: 'default-elements', defaultElements })} />);

      fireEvent.change(screen.getByRole('spinbutton', { name: 'Size (% of tile)' }), { target: { value: '22' } });

      expect(defaultElements.onResizeSlot).toHaveBeenCalledWith(secondNode.id, 22);
    });

    it('calls defaultElements.onSave when Save is clicked in Default-elements mode', () => {
      const defaultElements = createDefaultElementsState({ isDirty: true });
      render(<TileDecorationEditorView {...createViewModel({ mode: 'default-elements', defaultElements })} />);

      fireEvent.click(screen.getByRole('button', { name: 'Save' }));

      expect(defaultElements.onSave).toHaveBeenCalledTimes(1);
    });

    it('shows the Save-row warning text only in Default-elements mode, not in Decorations mode', () => {
      const { rerender } = render(<TileDecorationEditorView {...createViewModel({ isDirty: true })} />);
      expect(screen.queryByText(SAVE_WARNING_TEXT)).not.toBeInTheDocument();

      rerender(
        <TileDecorationEditorView
          {...createViewModel({
            mode: 'default-elements',
            defaultElements: createDefaultElementsState({ isDirty: true }),
          })}
        />,
      );
      expect(screen.getByText(SAVE_WARNING_TEXT)).toBeInTheDocument();
    });

    it('never renders a Layer (z-index) field in Default-elements mode, for any row', () => {
      DEFAULT_ELEMENT_ROWS.forEach((row) => {
        const draft = toIslandTileSlotsDraft();
        const slots = toSlotsForRow(row, draft);
        const selectedSlotId = slots[0]?.id ?? null;
        const { unmount } = render(
          <TileDecorationEditorView
            {...createViewModel({
              mode: 'default-elements',
              defaultElements: createDefaultElementsState({ draft, activeRow: row, slots, selectedSlotId }),
            })}
          />,
        );

        expect(screen.queryByText('Layer (z-index)')).not.toBeInTheDocument();
        expect(screen.queryByRole('spinbutton', { name: 'Layer (z-index)' })).not.toBeInTheDocument();

        unmount();
      });
    });

    it('never renders the Add/Duplicate/Rename/Delete layout controls in Default-elements mode', () => {
      render(<TileDecorationEditorView {...createViewModel({ mode: 'default-elements' })} />);

      expect(screen.queryByRole('button', { name: 'Add layout' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Duplicate' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Rename' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument();
    });
  });
});

describe('TileDecorationEditor (connected)', () => {
  it('renders the view with the hook output', () => {
    jest.mocked(useTileDecorationEditor).mockReturnValue(createViewModel());

    render(<TileDecorationEditor />);

    expect(screen.getByRole('combobox', { name: 'Scenario' })).toHaveTextContent('Base');
    expect(screen.getAllByRole('button', { name: /^Decoration \d of 2, / })).toHaveLength(2);
  });
});
