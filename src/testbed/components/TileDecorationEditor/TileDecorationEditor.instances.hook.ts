import { useCallback } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { DecorationLayout, DecorationLayoutsConfig, DecorationScenarioKey } from '@/modules/map';
import { createId } from './TileDecorationEditor.ids';
import { createInstance, removeInstance } from './TileDecorationEditor.map';

interface InstanceEditArgs {
  scenarioKey: DecorationScenarioKey;
  activeLayoutId: string;
  setConfig: Dispatch<SetStateAction<DecorationLayoutsConfig>>;
  setIsDirty: (dirty: boolean) => void;
  setSelectedInstanceId: Dispatch<SetStateAction<string | null>>;
}

/** Edits to the instances of the active layout: add, remove, and apply a change to one instance. */
export function useInstanceEdits({ scenarioKey, activeLayoutId, setConfig, setIsDirty, setSelectedInstanceId }: InstanceEditArgs) {
  const updateActiveLayout = useCallback(
    (updater: (layout: DecorationLayout) => DecorationLayout) => {
      setConfig((previous) => ({
        ...previous,
        [scenarioKey]: previous[scenarioKey].map((layout) =>
          layout.id === activeLayoutId ? updater(layout) : layout,
        ),
      }));
      setIsDirty(true);
    },
    [activeLayoutId, scenarioKey, setConfig, setIsDirty],
  );

  const updateInstance = useCallback(
    (instanceId: string, apply: (instance: DecorationLayout['instances'][number]) => DecorationLayout['instances'][number]) =>
      updateActiveLayout((layout) => ({
        ...layout,
        instances: layout.instances.map((instance) => (instance.id === instanceId ? apply(instance) : instance)),
      })),
    [updateActiveLayout],
  );
  const onAddInstance = useCallback(
    (image: string) => {
      const instance = createInstance(createId(`${scenarioKey}-instance`), image);
      updateActiveLayout((layout) => ({ ...layout, instances: [...layout.instances, instance] }));
      setSelectedInstanceId(instance.id);
    },
    [scenarioKey, updateActiveLayout, setSelectedInstanceId],
  );

  const onRemoveInstance = useCallback(
    (instanceId: string) => {
      updateActiveLayout((layout) => removeInstance(layout, instanceId));
      setSelectedInstanceId((current) => (current === instanceId ? null : current));
    },
    [updateActiveLayout, setSelectedInstanceId],
  );


  return { updateInstance, onAddInstance, onRemoveInstance };
}
