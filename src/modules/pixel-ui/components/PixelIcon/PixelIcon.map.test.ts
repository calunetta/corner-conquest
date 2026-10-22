import { existsSync } from 'fs';
import path from 'path';
import { toIconSource } from './PixelIcon.map';
import type {
  PixelIconColorName,
  PixelIconGreyName,
  PixelIconName,
  PixelIconState,
} from './PixelIcon.types';

const PUBLIC_DIR = path.resolve(__dirname, '../../../../../public');

const toDiskPath = (url: string): string => path.join(PUBLIC_DIR, decodeURI(url));

const COLOR_ICON_URLS: Record<PixelIconColorName, string> = {
  hammer: '/tiny-swords/UI%20Elements/UI%20Elements/Icons/Icon_01.png',
  wood: '/tiny-swords/UI%20Elements/UI%20Elements/Icons/Icon_02.png',
  gold: '/tiny-swords/UI%20Elements/UI%20Elements/Icons/Icon_03.png',
  food: '/tiny-swords/UI%20Elements/UI%20Elements/Icons/Icon_04.png',
  attack: '/tiny-swords/UI%20Elements/UI%20Elements/Icons/Icon_05.png',
  close: '/tiny-swords/UI%20Elements/UI%20Elements/Icons/Icon_09.png',
  settings: '/tiny-swords/UI%20Elements/UI%20Elements/Icons/Icon_10.png',
  info: '/tiny-swords/UI%20Elements/UI%20Elements/Icons/Icon_11.png',
  music: '/tiny-swords/UI%20Elements/UI%20Elements/Icons/Icon_12.png',
};

// [name, regular, pressed, disabled] - each state uses its own sheet prefix.
const GREY_ICON_URLS: Array<[PixelIconGreyName, string, string, string]> = [
  ['grey-close', '/tiny-swords/UI/Icons/Regular_01.png', '/tiny-swords/UI/Icons/Pressed_01.png', '/tiny-swords/UI/Icons/Disable_01.png'],
  ['grey-settings', '/tiny-swords/UI/Icons/Regular_02.png', '/tiny-swords/UI/Icons/Pressed_02.png', '/tiny-swords/UI/Icons/Disable_02.png'],
  ['grey-sound', '/tiny-swords/UI/Icons/Regular_03.png', '/tiny-swords/UI/Icons/Pressed_03.png', '/tiny-swords/UI/Icons/Disable_03.png'],
  ['grey-one', '/tiny-swords/UI/Icons/Regular_04.png', '/tiny-swords/UI/Icons/Pressed_04.png', '/tiny-swords/UI/Icons/Disable_04.png'],
  ['grey-two', '/tiny-swords/UI/Icons/Regular_05.png', '/tiny-swords/UI/Icons/Pressed_05.png', '/tiny-swords/UI/Icons/Disable_05.png'],
  ['grey-three', '/tiny-swords/UI/Icons/Regular_06.png', '/tiny-swords/UI/Icons/Pressed_06.png', '/tiny-swords/UI/Icons/Disable_06.png'],
  ['grey-cart', '/tiny-swords/UI/Icons/Regular_07.png', '/tiny-swords/UI/Icons/Pressed_07.png', '/tiny-swords/UI/Icons/Disable_07.png'],
  ['grey-plus', '/tiny-swords/UI/Icons/Regular_08.png', '/tiny-swords/UI/Icons/Pressed_08.png', '/tiny-swords/UI/Icons/Disable_08.png'],
  ['grey-minus', '/tiny-swords/UI/Icons/Regular_09.png', '/tiny-swords/UI/Icons/Pressed_09.png', '/tiny-swords/UI/Icons/Disable_09.png'],
  ['grey-unlock', '/tiny-swords/UI/Icons/Regular_10.png', '/tiny-swords/UI/Icons/Pressed_10.png', '/tiny-swords/UI/Icons/Disable_10.png'],
];

const ALL_STATES: PixelIconState[] = ['regular', 'pressed', 'disabled'];

describe('toIconSource', () => {
  describe('colour icons', () => {
    it.each(Object.entries(COLOR_ICON_URLS) as Array<[PixelIconColorName, string]>)(
      '%s maps to its exact sheet URL',
      (name, url) => {
        expect(toIconSource(name, 'lg', 'regular')).toEqual({ url, px: 64 });
      },
    );

    it.each(
      Object.keys(COLOR_ICON_URLS).flatMap((name) =>
        ALL_STATES.map((state) => [name, state] as const),
      ),
    )('%s ignores state %s', (name, state) => {
      const colour = name as PixelIconColorName;

      expect(toIconSource(colour, 'sm', state)?.url).toBe(COLOR_ICON_URLS[colour]);
    });
  });

  describe('grey icons', () => {
    it.each(GREY_ICON_URLS)('%s regular uses the Regular_ sheet', (name, regular) => {
      expect(toIconSource(name, 'sm', 'regular')?.url).toBe(regular);
    });

    it.each(GREY_ICON_URLS)('%s pressed uses the Pressed_ sheet', (name, _regular, pressed) => {
      expect(toIconSource(name, 'sm', 'pressed')?.url).toBe(pressed);
    });

    it.each(GREY_ICON_URLS)('%s disabled uses the Disable_ sheet', (name, _regular, _pressed, disabled) => {
      expect(toIconSource(name, 'sm', 'disabled')?.url).toBe(disabled);
    });
  });

  describe('size', () => {
    it.each([
      ['sm', 32],
      ['lg', 64],
    ] as const)('size %s renders at %i px', (size, px) => {
      expect(toIconSource('gold', size, 'regular')?.px).toBe(px);
      expect(toIconSource('grey-plus', size, 'pressed')?.px).toBe(px);
    });
  });

  describe('unknown names', () => {
    it.each([
      ['empty string', ''],
      ['not an icon', 'unknown'],
      ['grey number out of range', 'grey-zero'],
      ['case differs', 'Gold'],
      ['prototype key toString', 'toString'],
      ['prototype key constructor', 'constructor'],
      ['prototype key hasOwnProperty', 'hasOwnProperty'],
      ['prototype key __proto__', '__proto__'],
    ])('%s (%p) returns null', (_label, name) => {
      expect(toIconSource(name as PixelIconName, 'lg', 'regular')).toBeNull();
    });
  });

  describe('every produced URL exists on disk', () => {
    const allUrls = [
      ...Object.values(COLOR_ICON_URLS),
      ...GREY_ICON_URLS.flatMap(([, regular, pressed, disabled]) => [regular, pressed, disabled]),
    ];

    it.each(allUrls)('%s', (url) => {
      expect(existsSync(toDiskPath(url))).toBe(true);
    });
  });
});
