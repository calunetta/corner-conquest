import type { Island } from '@/lib/types';
import type { DecorationLayoutsConfig } from '../../decoration-layouts.types';

export interface TileDecorationsProps {
  island: Island;
  isBase?: boolean;
  /** The layouts to draw from: the tile's variant, or the defaults when omitted. */
  layouts?: DecorationLayoutsConfig;
}
