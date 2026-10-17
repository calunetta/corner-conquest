import { clampDecorationPosition, isDecorationPositionInBounds } from './decoration-bounds.map';

describe('clampDecorationPosition', () => {
  it('keeps a position that is already inside the bounds', () => {
    expect(clampDecorationPosition({ top: 40, left: 50 })).toEqual({ top: 40, left: 50 });
  });

  it('raises top to 3 and left to 8 at the lower edge, and lowers both to 85 at the upper edge', () => {
    expect(clampDecorationPosition({ top: 0, left: 0 })).toEqual({ top: 3, left: 8 });
    expect(clampDecorationPosition({ top: 100, left: 100 })).toEqual({ top: 85, left: 85 });
  });

  it('uses the lower bound for values that are not finite', () => {
    expect(clampDecorationPosition({ top: Number.NaN, left: Number.POSITIVE_INFINITY })).toEqual({ top: 3, left: 8 });
  });
});

describe('isDecorationPositionInBounds', () => {
  it('accepts the edges and rejects anything outside them', () => {
    expect(isDecorationPositionInBounds({ top: 3, left: 8 })).toBe(true);
    expect(isDecorationPositionInBounds({ top: 85, left: 85 })).toBe(true);
    expect(isDecorationPositionInBounds({ top: 2.9, left: 50 })).toBe(false);
    expect(isDecorationPositionInBounds({ top: 50, left: 7.9 })).toBe(false);
    expect(isDecorationPositionInBounds({ top: 85.1, left: 50 })).toBe(false);
  });
});
