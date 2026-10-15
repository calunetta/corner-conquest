import {
  BASE_RESOURCE_SLOTS,
  BOAT_CORNER_POSITIONS,
  CORNER_TRANSFORMS,
  DUAL_RESOURCE_SLOTS,
  OCCUPANT_CORNER_SLOTS,
  QUAD_RESOURCE_SLOTS,
  SINGLE_RESOURCE_SLOT,
  TRIPLE_RESOURCE_SLOTS,
} from './island-tile-slots.types';

// Literal expectations, copied from the hand-tuned slot tables (island-tile-slots.types.ts). Do not derive
// them from the table under test: a silent change to a constant must fail here.

describe('BOAT_CORNER_POSITIONS', () => {
  it('lists corners in the load-bearing order br, tr, tl, bl', () => {
    expect(BOAT_CORNER_POSITIONS.map((corner) => corner.id)).toEqual(['br', 'tr', 'tl', 'bl']);
  });

  it.each([
    ['br', { bottom: '0', right: '0' }],
    ['tr', { top: '0', right: '0' }],
    ['tl', { top: '0', left: '0' }],
    ['bl', { bottom: '0', left: '0' }],
  ])('pins the anchor style for corner %s', (id, expectedStyle) => {
    const corner = BOAT_CORNER_POSITIONS.find((entry) => entry.id === id);
    expect(corner?.style).toEqual(expectedStyle);
  });
});

describe('CORNER_TRANSFORMS', () => {
  it.each([
    ['br', 'translate(50%, 50%)'],
    ['tr', 'translate(50%, -50%)'],
    ['tl', 'translate(-50%, -50%)'],
    ['bl', 'translate(-50%, 50%)'],
  ])('pins the centering transform for corner %s', (id, expectedTransform) => {
    expect(CORNER_TRANSFORMS[id as keyof typeof CORNER_TRANSFORMS]).toBe(expectedTransform);
  });
});

describe('OCCUPANT_CORNER_SLOTS', () => {
  it('lists corners in the same load-bearing order as BOAT_CORNER_POSITIONS: br, tr, tl, bl', () => {
    expect(OCCUPANT_CORNER_SLOTS.map((corner) => corner.id)).toEqual(['br', 'tr', 'tl', 'bl']);
  });

  it.each([
    ['br', { bottom: '-1%', right: '-5%' }],
    ['tr', { top: '-20%', right: '-5%' }],
    ['tl', { top: '-20%', left: '-5%' }],
    ['bl', { bottom: '-1%', left: '-5%' }],
  ])('pins the offset knight anchor for corner %s', (id, expectedStyle) => {
    const corner = OCCUPANT_CORNER_SLOTS.find((entry) => entry.id === id);
    expect(corner?.style).toEqual(expectedStyle);
  });

  it('never carries a transform: each knight is flush-anchored by its own offset edges', () => {
    OCCUPANT_CORNER_SLOTS.forEach((corner) => {
      expect(corner.style).not.toHaveProperty('transform');
    });
  });
});

describe('resource slot tables', () => {
  it('pins the single-node slot center in the middle band', () => {
    expect(SINGLE_RESOURCE_SLOT).toEqual({
      top: '50%',
      left: '50%',
      size: 40,
    });
  });

  it('pins the two-node slot centers', () => {
    expect(DUAL_RESOURCE_SLOTS).toEqual([
      { top: '20%', left: '50%', size: 40 },
      { top: '55%', left: '60%', size: 40 },
    ]);
  });

  it('pins the three-node slot centers', () => {
    expect(TRIPLE_RESOURCE_SLOTS).toEqual([
      { top: '20%', left: '45%', size: 40 },
      { top: '45%', left: '75%', size: 40 },
      { top: '55%', left: '35%', size: 40 },
    ]);
  });

  it('pins the four-node slot centers', () => {
    expect(QUAD_RESOURCE_SLOTS).toEqual([
      { top: '20%', left: '35%', size: 40 },
      { top: '25%', left: '70%', size: 40 },
      { top: '50%', left: '30%', size: 40 },
      { top: '60%', left: '80%', size: 40 },
    ]);
  });

  it('pins the three Base resource slot centers', () => {
    expect(BASE_RESOURCE_SLOTS).toEqual([
      { top: '60%', left: '20%', size: 30 },
      { top: '45%', right: '-17%', size: 30 },
      { top: '15%', left: '50%', size: 30 },
    ]);
  });
});
