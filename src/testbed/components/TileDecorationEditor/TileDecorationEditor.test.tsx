import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { TileDecorationEditor, TileDecorationEditorView } from './TileDecorationEditor';
import { useTileDecorationEditor } from './TileDecorationEditor.hook';
import { sampleDecorationImages, sampleDecorationLayoutsConfig } from './TileDecorationEditor.fixtures';
import { toScenarioOptions } from './TileDecorationEditor.map';
import type { TileDecorationEditorViewModel } from './TileDecorationEditor.types';

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

/** A view model for the Base scenario, with every handler a jest.fn so each test can assert calls. */
function createViewModel(overrides: Partial<TileDecorationEditorViewModel> = {}): TileDecorationEditorViewModel {
  return {
    scenarioOptions: toScenarioOptions(),
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

      firePointer(sprite, 'pointerdown', { clientX: 100, clientY: 100 });
      firePointer(sprite, 'pointermove', { clientX: 150, clientY: 50 });
      firePointer(sprite, 'pointerup', { clientX: 150, clientY: 50 });

      expect(viewModel.onDragInstance).toHaveBeenLastCalledWith(FIRST_BASE_INSTANCE_ID, 25, 75);
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
});

describe('TileDecorationEditor (connected)', () => {
  it('renders the view with the hook output', () => {
    jest.mocked(useTileDecorationEditor).mockReturnValue(createViewModel());

    render(<TileDecorationEditor />);

    expect(screen.getByRole('combobox', { name: 'Scenario' })).toHaveTextContent('Base');
    expect(screen.getAllByRole('button', { name: /^Decoration \d of 2, / })).toHaveLength(2);
  });
});
