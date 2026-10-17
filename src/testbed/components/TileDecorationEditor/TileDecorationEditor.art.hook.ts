import { useCallback, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { DecorationLayoutsConfig, DecorationScenarioKey } from '@/modules/map';
import { type TileVariant, type TileVariantsConfig } from '@/modules/map/components/TileVariants/TileVariants.config';
import { toDecorationLayoutsConfig } from '@/modules/map/components/TileVariants';
import { cloneDecorationLayoutsConfig, DEFAULT_ART_ID, toArtOptions } from './TileDecorationEditor.map';

interface ArtVariantArgs {
  /** The saved tile variants, as loaded. */
  initialTileConfig: TileVariantsConfig;
  /** The saved default layouts; each variant starts from these. */
  baseLayouts: DecorationLayoutsConfig;
  activeScenario: string;
  scenarioKey: DecorationScenarioKey;
  setConfig: Dispatch<SetStateAction<DecorationLayoutsConfig>>;
  setActiveLayoutId: (id: string) => void;
  setSelectedInstanceId: (id: string | null) => void;
  setIsDirty: (dirty: boolean) => void;
}

/** Which art variant the decorations are edited for. Each variant owns a copy of its layouts; the default edits the shared file. */
export function useArtVariants({ initialTileConfig, baseLayouts, activeScenario, scenarioKey, setConfig, setActiveLayoutId, setSelectedInstanceId, setIsDirty }: ArtVariantArgs) {
  const [tileConfig, setTileConfig] = useState<TileVariantsConfig>(initialTileConfig);
  const [artVariantId, setArtVariantId] = useState(DEFAULT_ART_ID);
  const selectedVariant: TileVariant | null =
    artVariantId === DEFAULT_ART_ID ? null : tileConfig.variants.find((variant) => variant.id === artVariantId) ?? null;

  const onArtVariantChange = useCallback(
    (id: string, key: DecorationScenarioKey = scenarioKey) => {
      const variant = tileConfig.variants.find((candidate) => candidate.id === id) ?? null;
      const nextConfig = cloneDecorationLayoutsConfig(toDecorationLayoutsConfig(baseLayouts, variant));
      setArtVariantId(id);
      setConfig(nextConfig);
      setActiveLayoutId(nextConfig[key][0].id);
      setSelectedInstanceId(null);
      setIsDirty(false);
    },
    [tileConfig, baseLayouts, scenarioKey, setConfig, setActiveLayoutId, setSelectedInstanceId, setIsDirty],
  );

  return {
    tileConfig,
    setTileConfig,
    selectedVariant,
    artOptions: toArtOptions(activeScenario, tileConfig),
    artVariantId,
    onArtVariantChange,
  };
}
