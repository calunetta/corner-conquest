// Server-side GIF decode and re-encode for fog variants. sharp decodes every frame to RGBA; gifenc
// writes them back with a per-frame delay. Transparent pixels (alpha 0) stay transparent.
import { GIFEncoder, applyPalette, quantize } from 'gifenc';
import sharp from 'sharp';

export interface GifFrames {
  width: number;
  height: number;
  /** Each frame as RGBA bytes, width x height x 4. */
  frames: Uint8Array[];
  /** Per-frame delays in ms, as stored in the source file. */
  delaysMs: number[];
}

export async function decodeGifFrames(bytes: Uint8Array): Promise<GifFrames> {
  const source = sharp(Buffer.from(bytes), { animated: true, pages: -1 });
  const metadata = await source.metadata();
  const { data, info } = await source.ensureAlpha().raw().toBuffer({ resolveWithObject: true });

  const frameHeight = info.pageHeight ?? info.height;
  const pageCount = info.pages ?? 1;
  const frameByteLength = info.width * frameHeight * 4;
  // Copied into plain Uint8Arrays: gifenc's quantize rejects Node Buffer views.
  const frames = Array.from({ length: pageCount }, (_, index) =>
    Uint8Array.from(data.subarray(index * frameByteLength, (index + 1) * frameByteLength)),
  );
  const delaysMs = frames.map((_, index) => metadata.delay?.[index] ?? 100);

  return { width: info.width, height: frameHeight, frames, delaysMs };
}

/**
 * Encodes RGBA frames as an infinitely looping GIF with one delay for every frame.
 *
 * Transparency gets its own palette slot. Quantizing alpha together with colour can merge fully
 * transparent pixels into opaque bins, which leaves grey "layers" where the fog should be see-through.
 */
export function encodeGif({ width, height, frames }: Pick<GifFrames, 'width' | 'height' | 'frames'>, delayMs: number): Buffer {
  const encoder = GIFEncoder();
  for (const frame of frames) {
    const { palette, index } = toIndexedFrame(frame);
    encoder.writeFrame(index, width, height, {
      palette,
      delay: delayMs,
      dispose: RESTORE_TO_BACKGROUND,
      transparent: true,
      transparentIndex: TRANSPARENT_SLOT,
    });
  }
  encoder.finish();
  return Buffer.from(encoder.bytes());
}

/** Palette slots 0..254 hold opaque colours; slot 255 is fully transparent. */
const TRANSPARENT_SLOT = 255;
/** GIF disposal 2: each frame's transparent pixels show the background, not the previous frame. */
const RESTORE_TO_BACKGROUND = 2;

function toIndexedFrame(frame: Uint8Array): { palette: number[][]; index: Uint8Array } {
  const opaque = new Uint8Array(frame);
  const isClear = new Uint8Array(frame.length / 4);
  for (let pixel = 0; pixel < isClear.length; pixel++) {
    const alphaOffset = pixel * 4 + 3;
    isClear[pixel] = opaque[alphaOffset] < 128 ? 1 : 0;
    opaque[alphaOffset] = 255;
  }

  const colours = quantize(opaque, TRANSPARENT_SLOT, { format: 'rgba4444' }).map((color) => [color[0], color[1], color[2], 255]);
  const index = applyPalette(opaque, colours, 'rgba4444');
  for (let pixel = 0; pixel < isClear.length; pixel++) {
    if (isClear[pixel]) index[pixel] = TRANSPARENT_SLOT;
  }
  return { palette: [...colours, [0, 0, 0, 0]], index };
}
