'use client';

import { TooltipProvider } from '@/components/ui/tooltip';
import type { DecorationScenarioKey } from '@/modules/map';
import { useTileDecorationEditor } from './TileDecorationEditor.hook';
import { styles } from './TileDecorationEditor.styles';
import type { TileDecorationEditorViewModel } from './TileDecorationEditor.types';
import { TileDecorationEditorCanvas } from './TileDecorationEditorCanvas';
import { TileDecorationEditorDefaultElementsActions } from './TileDecorationEditorDefaultElementsActions';
import { TileDecorationEditorDefaultElementsCanvas } from './TileDecorationEditorDefaultElementsCanvas';
import { TileDecorationEditorDefaultElementsInspector } from './TileDecorationEditorDefaultElementsInspector';
import { TileDecorationEditorDefaultElementsRail } from './TileDecorationEditorDefaultElementsRail';
import { TileDecorationEditorInspector } from './TileDecorationEditorInspector';
import { TileDecorationEditorRail } from './TileDecorationEditorRail';
import { TileDecorationEditorRailShell } from './TileDecorationEditorRailShell';

/** Pure view: rail, canvas and inspector side by side on desktop, stacked in that order on mobile.
 *  Everything comes from the view model, so tests and previews need no config or fetch. The mode
 *  Tabs live in the shared rail shell; only the rail/canvas/inspector content below them swaps by
 *  mode (ui-design.md's Final spec: the Decorations mode's content is otherwise unchanged). */
export function TileDecorationEditorView(viewModel: TileDecorationEditorViewModel) {
  const { mode, onModeChange, layouts, activeLayoutId, activeScenario, activeVariant, selectedInstanceId, defaultElements } =
    viewModel;
  const activeLayout = layouts.find((layout) => layout.id === activeLayoutId) ?? layouts[0];
  // activeVariant is null only for Base and Special, whose outer scenario key is their own scenario key.
  const scenarioKey = activeVariant ?? (activeScenario as DecorationScenarioKey);
  const selectedInstance = activeLayout.instances.find((instance) => instance.id === selectedInstanceId) ?? null;
  const selectedSlot = defaultElements.slots.find((slot) => slot.id === defaultElements.selectedSlotId) ?? null;
  const isDecorationsMode = mode === 'decorations';

  return (
    <TooltipProvider>
      <div className={styles.root}>
        <TileDecorationEditorRailShell mode={mode} onModeChange={onModeChange}>
          {isDecorationsMode ? (
            <TileDecorationEditorRail {...viewModel} />
          ) : (
            <>
              <TileDecorationEditorDefaultElementsRail
                activeRowId={defaultElements.activeRowId}
                onSelectRow={defaultElements.onSelectRow}
              />
              <TileDecorationEditorDefaultElementsActions
                isDirty={defaultElements.isDirty}
                status={defaultElements.status}
                onSave={defaultElements.onSave}
              />
            </>
          )}
        </TileDecorationEditorRailShell>

        <div className={styles.canvasColumn}>
          {isDecorationsMode ? (
            <TileDecorationEditorCanvas
              scenarioKey={scenarioKey}
              instances={activeLayout.instances}
              selectedInstanceId={selectedInstanceId}
              onSelectInstance={viewModel.onSelectInstance}
              onDragInstance={viewModel.onDragInstance}
              onNudgeInstance={viewModel.onNudgeInstance}
            />
          ) : (
            <TileDecorationEditorDefaultElementsCanvas
              activeRow={defaultElements.activeRow}
              slots={defaultElements.slots}
              selectedSlotId={defaultElements.selectedSlotId}
              onSelectSlot={defaultElements.onSelectSlot}
              onDragSlot={defaultElements.onDragSlot}
              onNudgeSlot={defaultElements.onNudgeSlot}
            />
          )}
        </div>

        {isDecorationsMode ? (
          <TileDecorationEditorInspector
            images={viewModel.images}
            selectedInstance={selectedInstance}
            onAddInstance={viewModel.onAddInstance}
            onResizeInstance={viewModel.onResizeInstance}
            onRelayerInstance={viewModel.onRelayerInstance}
            onRemoveInstance={viewModel.onRemoveInstance}
          />
        ) : (
          <TileDecorationEditorDefaultElementsInspector
            activeRow={defaultElements.activeRow}
            draft={defaultElements.draft}
            selectedSlot={selectedSlot}
            onResizeSharedCornerSize={defaultElements.onResizeSharedCornerSize}
            onResizeSlot={defaultElements.onResizeSlot}
            onResizeCrest={defaultElements.onResizeCrest}
          />
        )}
      </div>
    </TooltipProvider>
  );
}

/** Connected component for the testbed: loads the config and image list through the editor hook. */
export function TileDecorationEditor() {
  return <TileDecorationEditorView {...useTileDecorationEditor()} />;
}
