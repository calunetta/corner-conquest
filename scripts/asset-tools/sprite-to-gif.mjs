#!/usr/bin/env node
// Slices a sprite sheet (uniform grid of square-ish frames) into an animated GIF
// with a real transparent background (alpha-aware palette, no black matte).
//
// Usage:
//   node scripts/asset-tools/sprite-to-gif.mjs <sheet.png> [options]
//
// Options:
//   --out <file.gif>     Output path (default: <sheet-basename>.gif next to the input)
//   --cols <n>            Frame columns (default: auto, assumes square frames: cols = width / height)
//   --rows <n>            Frame rows (default: 1)
//   --fps <n>             Playback frames per second (default: 8)
//   --frames <n>          Use only the first n frames (default: all cols*rows)
//   --scale <n>           Integer upscale factor, nearest-neighbor (default: 1)
//
// Example (Tiny Swords boat idle, single-row sheet):
//   node scripts/asset-tools/sprite-to-gif.mjs "public/tiny-swords/Enemy Pack/Extra/Boat/Boat_Idle.png" --out public/sprites/boat.gif --fps 6

import sharp from "sharp";
import gifenc from "gifenc";
const { GIFEncoder, quantize, applyPalette } = gifenc;
import path from "node:path";
import fs from "node:fs";

function parseArgs(argv) {
  const [input, ...rest] = argv;
  if (!input) {
    console.error("Usage: sprite-to-gif.mjs <sheet.png> [--out f.gif] [--cols n] [--rows n] [--fps n] [--frames n] [--scale n]");
    process.exit(1);
  }
  const opts = { input, rows: 1, fps: 8, scale: 1 };
  for (let i = 0; i < rest.length; i += 2) {
    const key = rest[i].replace(/^--/, "");
    opts[key] = rest[i + 1];
  }
  return opts;
}

function extractFrame(raw, sheetWidth, frameX, frameY, frameW, frameH) {
  const out = new Uint8Array(frameW * frameH * 4);
  for (let y = 0; y < frameH; y++) {
    const srcStart = ((frameY + y) * sheetWidth + frameX) * 4;
    const destStart = y * frameW * 4;
    out.set(raw.subarray(srcStart, srcStart + frameW * 4), destStart);
  }
  return out;
}

function upscaleNearest(rgba, width, height, scale) {
  if (scale <= 1) return { data: rgba, width, height };
  const outW = width * scale;
  const outH = height * scale;
  const out = new Uint8Array(outW * outH * 4);
  for (let y = 0; y < outH; y++) {
    const srcY = Math.floor(y / scale);
    for (let x = 0; x < outW; x++) {
      const srcX = Math.floor(x / scale);
      const srcIdx = (srcY * width + srcX) * 4;
      const destIdx = (y * outW + x) * 4;
      out[destIdx] = rgba[srcIdx];
      out[destIdx + 1] = rgba[srcIdx + 1];
      out[destIdx + 2] = rgba[srcIdx + 2];
      out[destIdx + 3] = rgba[srcIdx + 3];
    }
  }
  return { data: out, width: outW, height: outH };
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const { data: raw, info } = await sharp(opts.input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const sheetWidth = info.width;
  const sheetHeight = info.height;

  const rows = Number(opts.rows) || 1;
  const frameHeight = Math.floor(sheetHeight / rows);
  const cols = opts.cols ? Number(opts.cols) : Math.round(sheetWidth / frameHeight);
  const frameWidth = Math.floor(sheetWidth / cols);
  const totalFrames = opts.frames ? Number(opts.frames) : cols * rows;
  const scale = Number(opts.scale) || 1;
  const delayMs = Math.round(1000 / (Number(opts.fps) || 8));

  console.log(`Sheet ${sheetWidth}x${sheetHeight} -> ${cols}x${rows} grid, frame ${frameWidth}x${frameHeight}, using ${totalFrames} frame(s)`);

  const frames = [];
  let frameIndex = 0;
  outer: for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      if (frameIndex >= totalFrames) break outer;
      const rgba = extractFrame(raw, sheetWidth, col * frameWidth, row * frameHeight, frameWidth, frameHeight);
      frames.push(upscaleNearest(rgba, frameWidth, frameHeight, scale));
      frameIndex++;
    }
  }

  const gif = GIFEncoder();
  for (const frame of frames) {
    const palette = quantize(frame.data, 256, { format: "rgba4444" });
    const index = applyPalette(frame.data, palette, "rgba4444");
    gif.writeFrame(index, frame.width, frame.height, { palette, delay: delayMs, transparent: true });
  }
  gif.finish();

  const outPath = opts.out || path.join(path.dirname(opts.input), `${path.basename(opts.input, path.extname(opts.input))}.gif`);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, gif.bytes());
  console.log(`Wrote ${outPath} (${frames.length} frame(s), ${delayMs}ms/frame)`);
}

main();
