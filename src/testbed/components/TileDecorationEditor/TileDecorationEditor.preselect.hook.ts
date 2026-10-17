import { useEffect } from 'react';
import type { DecorationScenarioKey } from '@/modules/map';
import { DEFAULT_TILE_VARIANTS_CONFIG } from '@/modules/map/components/TileVariants/TileVariants.config';
import { firstVariantKey, toOuterScenarioKey, toScenarioKey, toScenarioOptions } from './TileDecorationEditor.map';

const SCENARIO_OPTIONS = toScenarioOptions();

interface PreselectArgs {
  goToScenario: (outerKey: string, variant: DecorationScenarioKey | null) => void;
  onArtVariantChange: (id: string, key?: DecorationScenarioKey) => void;
}

/** "Edit decorations" in the variant editor links here with ?art=<variant id>. Opens that variant's
 *  scenario and art once, on mount. Runs in an effect, not during render, so server and client markup match. */
export function usePreselectArtFromUrl({ goToScenario, onArtVariantChange }: PreselectArgs) {
  useEffect(() => {
    const artId = new URLSearchParams(window.location.search).get('art');
    const variant = DEFAULT_TILE_VARIANTS_CONFIG.variants.find((candidate) => candidate.id === artId);
    if (!variant || variant.id.startsWith('default-')) return;
    const outerKey = toOuterScenarioKey(variant.type);
    const variantKey = firstVariantKey(outerKey, SCENARIO_OPTIONS);
    goToScenario(outerKey, variantKey);
    onArtVariantChange(variant.id, toScenarioKey(outerKey, variantKey));
    // The URL is only the starting point: run once per page load, not on every change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
