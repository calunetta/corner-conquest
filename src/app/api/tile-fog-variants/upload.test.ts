import { isGifBytes, isPngBytes, toVariantId } from './upload';

describe('fog variant upload helpers', () => {
  it('recognises PNG and GIF by their magic bytes, not by file name', () => {
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
    const gif = new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]);

    expect(isPngBytes(png)).toBe(true);
    expect(isPngBytes(gif)).toBe(false);
    expect(isGifBytes(gif)).toBe(true);
    expect(isGifBytes(png)).toBe(false);
    expect(isGifBytes(new Uint8Array([]))).toBe(false);
  });

  it('turns a display name into a safe id', () => {
    expect(toVariantId('  Ember Haze! ')).toBe('ember-haze');
    expect(toVariantId('../../etc')).toBe('etc');
    expect(toVariantId('!!!')).toBe('');
  });
});
