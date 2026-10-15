import { useCallback } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { DecorationLayout, DecorationLayoutsConfig, DecorationScenarioKey } from '@/modules/map';
import { createId } from './TileDecorationEditor.ids';
import { duplicateLayout, removeLayout, renameLayout } from './TileDecorationEditor.map';

interface LayoutActionsParams {
  scenarioKey: DecorationScenarioKey;
  layouts: DecorationLayout[];
  activeLayoutId: string;
  setConfig: Dispatch<SetStateAction<DecorationLayoutsConfig>>;
  setActiveLayoutId: Dispatch<SetStateAction<string>>;
  setSelectedInstanceId: Dispatch<SetStateAction<string | null>>;
  setIsDirty: Dispatch<SetStateAction<boolean>>;
}

interface LayoutActions {
  onAddLayout: (name: string) => void;
  onDuplicateLayout: () => void;
  onRenameLayout: (name: string) => void;
  onDeleteLayout: () => void;
}

/** Add/duplicate/rename/delete handlers for the active scenario's layout list. Split out of
 *  TileDecorationEditor.hook.ts, which owns the config state these mutate, to keep both files
 *  under the 150-line lint limit. */
export function useLayoutActions({
  scenarioKey,
  layouts,
  activeLayoutId,
  setConfig,
  setActiveLayoutId,
  setSelectedInstanceId,
  setIsDirty,
}: LayoutActionsParams): LayoutActions {
  const onAddLayout = useCallback(
    (name: string) => {
      const newLayout = { id: createId(`${scenarioKey}-layout`), name, instances: [] };
      setConfig((previous) => ({ ...previous, [scenarioKey]: [...previous[scenarioKey], newLayout] }));
      setActiveLayoutId(newLayout.id);
      setSelectedInstanceId(null);
      setIsDirty(true);
    },
    [scenarioKey, setActiveLayoutId, setConfig, setIsDirty, setSelectedInstanceId],
  );

  const onDuplicateLayout = useCallback(() => {
    const active = layouts.find((layout) => layout.id === activeLayoutId);
    if (!active) return;

    const newLayoutId = createId(`${scenarioKey}-layout`);
    const instanceIds = active.instances.map(() => createId(`${scenarioKey}-instance`));
    const copy = duplicateLayout(active, newLayoutId, instanceIds);
    setConfig((previous) => ({ ...previous, [scenarioKey]: [...previous[scenarioKey], copy] }));
    setActiveLayoutId(copy.id);
    setSelectedInstanceId(null);
    setIsDirty(true);
  }, [activeLayoutId, layouts, scenarioKey, setActiveLayoutId, setConfig, setIsDirty, setSelectedInstanceId]);

  const onRenameLayout = useCallback(
    (name: string) => {
      setConfig((previous) => ({
        ...previous,
        [scenarioKey]: previous[scenarioKey].map((layout) =>
          layout.id === activeLayoutId ? renameLayout(layout, name) : layout,
        ),
      }));
      setIsDirty(true);
    },
    [activeLayoutId, scenarioKey, setConfig, setIsDirty],
  );

  const onDeleteLayout = useCallback(() => {
    if (layouts.length <= 1) return;

    const remaining = removeLayout(layouts, activeLayoutId);
    setConfig((previous) => ({ ...previous, [scenarioKey]: remaining }));
    setActiveLayoutId(remaining[0].id);
    setSelectedInstanceId(null);
    setIsDirty(true);
  }, [activeLayoutId, layouts, scenarioKey, setActiveLayoutId, setConfig, setIsDirty, setSelectedInstanceId]);

  return { onAddLayout, onDuplicateLayout, onRenameLayout, onDeleteLayout };
}
