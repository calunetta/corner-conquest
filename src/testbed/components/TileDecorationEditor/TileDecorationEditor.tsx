'use client';

import { TooltipProvider } from '@/components/ui/tooltip';
import type { DecorationScenarioKey } from '@/modules/map';
import { useTileDecorationEditor } from './TileDecorationEditor.hook';
import { styles } from './TileDecorationEditor.styles';
import type { TileDecorationEditorViewModel } from './TileDecorationEditor.types';
import { TileDecorationEditorCanvas } from './TileDecorationEditorCanvas';
import { TileDecorationEditorInspector } from './TileDecorationEditorInspector';
import { TileDecorationEditorRail } from './TileDecorationEditorRail';

/** Pure view: rail, canvas and inspector side by side on desktop, stacked in that order on mobile.
 *  Everything comes from the view model, so tests and previews need no config or fetch. */
export function TileDecorationEditorView(viewModel: TileDecorationEditorViewModel) {
  const { layouts, activeLayoutId, activeScenario, activeVariant, selectedInstanceId } = viewModel;
  const activeLayout = layouts.find((layout) => layout.id === activeLayoutId) ?? layouts[0];
  // activeVariant is null only for Base and Special, whose outer scenario key is their own scenario key.
  const scenarioKey = activeVariant ?? (activeScenario as DecorationScenarioKey);
  const selectedInstance = activeLayout.instances.find((instance) => instance.id === selectedInstanceId) ?? null;

  return (
    <TooltipProvider>
      <div className={styles.root}>
        <TileDecorationEditorRail {...viewModel} />
        <div className={styles.canvasColumn}>
          <TileDecorationEditorCanvas
            scenarioKey={scenarioKey}
            instances={activeLayout.instances}
            selectedInstanceId={selectedInstanceId}
            onSelectInstance={viewModel.onSelectInstance}
            onDragInstance={viewModel.onDragInstance}
            onNudgeInstance={viewModel.onNudgeInstance}
          />
        </div>
        <TileDecorationEditorInspector
          images={viewModel.images}
          selectedInstance={selectedInstance}
          onAddInstance={viewModel.onAddInstance}
          onResizeInstance={viewModel.onResizeInstance}
          onRelayerInstance={viewModel.onRelayerInstance}
          onRemoveInstance={viewModel.onRemoveInstance}
        />
      </div>
    </TooltipProvider>
  );
}

/** Connected component for the testbed: loads the config and image list through the editor hook. */
export function TileDecorationEditor() {
  return <TileDecorationEditorView {...useTileDecorationEditor()} />;
}
