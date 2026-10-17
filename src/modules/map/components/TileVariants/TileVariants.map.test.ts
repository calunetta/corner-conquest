import { toOffsetSlotStyle, toPlacementStyle } from './TileVariants.map';

describe('toPlacementStyle', () => {
  it('centres the image on its x/y and sizes it in percent of the tile', () => {
    expect(toPlacementStyle({ x: 30, y: 60, size: 40 })).toMatchObject({
      left: '30%',
      top: '60%',
      width: '40%',
      height: '40%',
    });
  });
});

describe('toOffsetSlotStyle', () => {
  it('leaves a slot unchanged when the variant is centred', () => {
    expect(toOffsetSlotStyle({ top: '30%', left: '40%' }, { x: 50, y: 50, size: 100 })).toEqual({ top: '30%', left: '40%' });
  });

  it('shifts left and top by the variant offset', () => {
    expect(toOffsetSlotStyle({ top: '30%', left: '40%' }, { x: 60, y: 45, size: 100 })).toEqual({
      top: 'calc(30% + -5%)',
      left: 'calc(40% + 10%)',
    });
  });

  it('keeps a right or bottom anchor as it is', () => {
    expect(toOffsetSlotStyle({ bottom: '10%', right: '5%' }, { x: 80, y: 80, size: 100 })).toEqual({ bottom: '10%', right: '5%' });
  });
});
