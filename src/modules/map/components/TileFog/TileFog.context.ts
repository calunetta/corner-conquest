import { createContext, useContext } from 'react';
import { DEFAULT_FOG_TIMING, DEFAULT_FOG_VARIANTS, type FogTiming, type FogVariant } from './TileFog.config';

export interface FogSettings {
  timing: FogTiming;
  variants: FogVariant[];
}

/** Game defaults from the config files. The testbed lab provides its own values. */
const FogSettingsContext = createContext<FogSettings>({
  timing: DEFAULT_FOG_TIMING,
  variants: DEFAULT_FOG_VARIANTS,
});

export const FogSettingsProvider = FogSettingsContext.Provider;

export function useFogSettings(): FogSettings {
  return useContext(FogSettingsContext);
}
