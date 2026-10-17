// gifenc ships no type declarations. Only the surface used by src/app/api/tile-fog-variants/gif.ts is typed.
declare module 'gifenc' {
  export type RgbaFormat = 'rgb565' | 'rgb444' | 'rgba4444';
  export type Palette = number[][];

  export interface QuantizeOptions {
    format?: RgbaFormat;
    oneBitAlpha?: boolean | number;
    clearAlpha?: boolean;
  }

  export interface WriteFrameOptions {
    palette?: Palette;
    delay?: number;
    dispose?: number;
    transparent?: boolean;
    transparentIndex?: number;
    repeat?: number;
  }

  export interface GifEncoderInstance {
    writeFrame(index: Uint8Array, width: number, height: number, options?: WriteFrameOptions): void;
    finish(): void;
    bytes(): Uint8Array;
  }

  export function GIFEncoder(): GifEncoderInstance;
  export function quantize(rgba: Uint8Array, maxColors: number, options?: QuantizeOptions): Palette;
  export function applyPalette(rgba: Uint8Array, palette: Palette, format?: RgbaFormat): Uint8Array;
}
