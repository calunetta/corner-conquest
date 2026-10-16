import { useCallback, useEffect, useRef, useState } from 'react';
import { decorationLayoutsConfig } from '@/modules/map';
import type { DecorationLayout, DecorationLayoutsConfig, DecorationScenarioKey } from '@/modules/map';
import { useDefaultElementsEditor } from './TileDecorationEditor.defaultElements.hook';
import { createId } from './TileDecorationEditor.ids';
import { useLayoutActions } from './TileDecorationEditor.layouts.hook';
import {
  cloneDecorationLayoutsConfig,
  createInstance,
  firstVariantKey,
  nudgeInstance,
  removeInstance,
  toScenarioKey,
  toScenarioOptions,
} from './TileDecorationEditor.map';
import { listDecorationImages, saveDecorationLayouts } from './TileDecorationEditor.service';
import type { EditorMode, TileDecorationEditorViewModel } from './TileDecorationEditor.types';

const SAVED_BADGE_DURATION_MS = 2000;
const SCENARIO_OPTIONS = toScenarioOptions();

/** Adapts the decoration-layouts config into the editor's view model: scenario/variant/layout
 *  navigation, instance selection, and the drag/nudge/resize/relayer/save handlers. The config
 *  is edited entirely in memory; onSave is the only place it leaves the component. Layout-list
 *  CRUD (add/duplicate/rename/delete) lives in TileDecorationEditor.layouts.hook.ts. */
export function useTileDecorationEditor(): TileDecorationEditorViewModel {
  const [mode, setMode] = useState<EditorMode>('decorations');
  const defaultElements = useDefaultElementsEditor();
  const [config, setConfig] = useState<DecorationLayoutsConfig>(() => cloneDecorationLayoutsConfig(decorationLayoutsConfig));
  const [activeScenario, setActiveScenario] = useState('base');
  const [activeVariant, setActiveVariant] = useState<DecorationScenarioKey | null>(null);
  const scenarioKey = toScenarioKey(activeScenario, activeVariant);
  const [activeLayoutId, setActiveLayoutId] = useState(config[scenarioKey][0].id);
  const [selectedInstanceId, setSelectedInstanceId] = useState<string | null>(null);
  const [images, setImages] = useState<string[]>([]);
  const [isDirty, setIsDirty] = useState(false);
  const [status, setStatus] = useState<TileDecorationEditorViewModel['status']>('idle');
  const savedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestConfigRef = useRef(config);
  const layouts = config[scenarioKey];

  useEffect(() => {
    latestConfigRef.current = config;
  }, [config]);

  useEffect(() => {
    listDecorationImages()
      .then(setImages)
      .catch((error: unknown) => {
        console.error('Failed to list decoration images', error);
        setImages([]);
      });
  }, []);

  useEffect(() => () => {
    if (savedTimeoutRef.current) clearTimeout(savedTimeoutRef.current);
  }, []);

  const layoutActions = useLayoutActions({
    scenarioKey,
    layouts,
    activeLayoutId,
    setConfig,
    setActiveLayoutId,
    setSelectedInstanceId,
    setIsDirty,
  });

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
    [activeLayoutId, scenarioKey],
  );

  const updateInstance = useCallback(
    (instanceId: string, apply: (instance: DecorationLayout['instances'][number]) => DecorationLayout['instances'][number]) =>
      updateActiveLayout((layout) => ({
        ...layout,
        instances: layout.instances.map((instance) => (instance.id === instanceId ? apply(instance) : instance)),
      })),
    [updateActiveLayout],
  );

  const goToScenario = useCallback(
    (outerKey: string, variant: DecorationScenarioKey | null) => {
      const nextKey = toScenarioKey(outerKey, variant);
      setActiveScenario(outerKey);
      setActiveVariant(variant);
      setActiveLayoutId(config[nextKey][0].id);
      setSelectedInstanceId(null);
    },
    [config],
  );

  const onAddInstance = useCallback(
    (image: string) => {
      const instance = createInstance(createId(`${scenarioKey}-instance`), image);
      updateActiveLayout((layout) => ({ ...layout, instances: [...layout.instances, instance] }));
      setSelectedInstanceId(instance.id);
    },
    [scenarioKey, updateActiveLayout],
  );

  const onRemoveInstance = useCallback(
    (instanceId: string) => {
      updateActiveLayout((layout) => removeInstance(layout, instanceId));
      setSelectedInstanceId((current) => (current === instanceId ? null : current));
    },
    [updateActiveLayout],
  );

  const onModeChange = (nextMode: EditorMode) => { setMode(nextMode); setSelectedInstanceId(null); defaultElements.clearSelection(); };

  const onSave = useCallback(() => {
    const savedConfig = config;
    setStatus('saving');
    saveDecorationLayouts(savedConfig)
      .then(() => {
        // An edit made while the request was in flight is not in savedConfig, so the editor must stay dirty.
        if (latestConfigRef.current === savedConfig) setIsDirty(false);
        setStatus('saved');
        if (savedTimeoutRef.current) clearTimeout(savedTimeoutRef.current);
        savedTimeoutRef.current = setTimeout(() => setStatus('idle'), SAVED_BADGE_DURATION_MS);
      })
      .catch((error: unknown) => {
        console.error('Failed to save decoration layouts', error);
        setStatus('error');
      });
  }, [config]);

  return {
    mode,
    onModeChange,
    defaultElements,
    scenarioOptions: SCENARIO_OPTIONS,
    activeScenario,
    activeVariant,
    layouts,
    activeLayoutId,
    selectedInstanceId,
    images,
    isDirty,
    status,
    canDeleteActiveLayout: layouts.length > 1,
    onScenarioChange: (outerKey) => goToScenario(outerKey, firstVariantKey(outerKey, SCENARIO_OPTIONS)),
    onVariantChange: (variant) => goToScenario(activeScenario, variant),
    onSelectLayout: (layoutId) => {
      setActiveLayoutId(layoutId);
      setSelectedInstanceId(null);
    },
    ...layoutActions,
    onAddInstance,
    onSelectInstance: setSelectedInstanceId,
    onDragInstance: (instanceId, top, left) => updateInstance(instanceId, (instance) => ({ ...instance, top, left })),
    onNudgeInstance: (instanceId, dTop, dLeft) =>
      updateInstance(instanceId, (instance) => nudgeInstance(instance, dTop, dLeft)),
    onResizeInstance: (instanceId, size) => updateInstance(instanceId, (instance) => ({ ...instance, size })),
    onRelayerInstance: (instanceId, z) => updateInstance(instanceId, (instance) => ({ ...instance, z })),
    onRemoveInstance,
    onSave,
  };
}
