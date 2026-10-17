import { readFileSync } from 'fs';
import path from 'path';
import { decodeGifFrames, encodeGif } from './gif';

const FOG_GIF = path.join(process.cwd(), 'public/sprites/fog.gif');

describe('fog GIF re-encoding', () => {
  it('keeps the frame count and size, and writes the requested delay on every frame', async () => {
    const source = await decodeGifFrames(readFileSync(FOG_GIF));
    expect(source.frames).toHaveLength(8);

    const retimed = await decodeGifFrames(new Uint8Array(encodeGif(source, 250)));

    expect(retimed.width).toBe(source.width);
    expect(retimed.height).toBe(source.height);
    expect(retimed.frames).toHaveLength(8);
    expect(retimed.delaysMs).toEqual(Array(8).fill(250));
  });

  it('keeps fully transparent pixels transparent', async () => {
    const width = 2;
    const height = 1;
    const opaque = [200, 40, 200, 255];
    const clear = [0, 0, 0, 0];
    const frame = new Uint8Array([...opaque, ...clear]);

    const roundTrip = await decodeGifFrames(new Uint8Array(encodeGif({ width, height, frames: [frame] }, 100)));
    const [pixels] = roundTrip.frames;

    expect(pixels[3]).toBe(255);
    expect(pixels[7]).toBe(0);
  });
});
