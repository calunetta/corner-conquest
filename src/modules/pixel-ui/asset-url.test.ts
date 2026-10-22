import { existsSync } from 'fs';
import path from 'path';
import { assetUrl } from './asset-url';

const PUBLIC_DIR = path.resolve(__dirname, '../../../public');

describe('assetUrl', () => {
  it('encodes every space in a path with spaces', () => {
    expect(assetUrl('UI Elements/UI Elements/Wood Table/WoodTable.png')).toBe(
      '/tiny-swords/UI%20Elements/UI%20Elements/Wood%20Table/WoodTable.png',
    );
  });

  it.each([
    ['UI/Ribbons/Ribbon_Blue_3Slides.png', '/tiny-swords/UI/Ribbons/Ribbon_Blue_3Slides.png'],
    ['a.png', '/tiny-swords/a.png'],
  ])('leaves a path without spaces unchanged apart from the prefix: %s', (input, expected) => {
    expect(assetUrl(input)).toBe(expected);
  });

  it('returns the bare root for an empty path', () => {
    expect(assetUrl('')).toBe('/tiny-swords/');
  });

  it.each([
    'UI Elements/UI Elements/Wood Table/WoodTable.png',
    'UI/Ribbons/Ribbon_Blue_3Slides.png',
  ])('produces a URL that decodes to an existing file under public/: %s', (asset) => {
    const url = assetUrl(asset);

    expect(existsSync(path.join(PUBLIC_DIR, decodeURI(url)))).toBe(true);
  });

  // Documents a limit, not a requirement: encodeURI leaves '#' and '?' as they are, and a browser
  // reads them as fragment and query. A file name containing either would load the wrong URL.
  // No asset in use has them; keep this in mind before adding such a file name.
  it("does not encode '#' or '?' (encodeURI leaves them as they are)", () => {
    expect(assetUrl('UI/a#b?c.png')).toBe('/tiny-swords/UI/a#b?c.png');
  });
});
