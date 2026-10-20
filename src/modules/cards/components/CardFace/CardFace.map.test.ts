import { toCardFaceDimensions } from './CardFace.map';
import type { CardFaceSize } from './CardFace.types';

describe('CardFace.map', () => {
  describe('toCardFaceDimensions', () => {
    it.each<[CardFaceSize, number, number]>([
      ['tile', 80, 120],
      ['hero', 200, 300],
      ['hero-compact', 150, 225],
    ])('%s is %ix%i', (size, width, height) => {
      expect(toCardFaceDimensions(size)).toEqual({ width, height });
    });

    it.each<CardFaceSize>(['tile', 'hero', 'hero-compact'])('%s keeps the 2:3 ratio', (size) => {
      const { width, height } = toCardFaceDimensions(size);
      expect(height / width).toBe(1.5);
    });
  });
});
