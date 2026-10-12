import {
  BASE_FOREST_SLOTS,
  BASE_RESOURCE_SLOTS,
  BOAT_CORNER_POSITIONS,
  CORNER_TRANSFORMS,
  DUAL_RESOURCE_SLOTS,
  EMPTY_GROVE_SLOTS,
  OCCUPANT_CORNER_SLOTS,
  SINGLE_RESOURCE_SLOT,
  SPECIAL_FOREST_SLOT,
  TRIPLE_RESOURCE_SLOTS,
} from './island-tile-slots.types';

// Literal expectations, copied from the approved spec (ui-design.md Final spec). Do not derive
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
    ['br', { bottom: '24%', right: '24%' }],
    ['tr', { top: '24%', right: '24%' }],
    ['tl', { top: '24%', left: '24%' }],
    ['bl', { bottom: '24%', left: '24%' }],
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
      top: '65.5%',
      left: '50%',
      size: 39,
    });
  });

  it('pins the two-node slot centers', () => {
    expect(DUAL_RESOURCE_SLOTS).toEqual([
      { top: '36%', left: '40%', size: 32 },
      { top: '86%', left: '60%', size: 32 },
    ]);
  });

  it('pins the three-node slot centers', () => {
    expect(TRIPLE_RESOURCE_SLOTS).toEqual([
      { top: '33.5%', left: '37.5%', size: 27 },
      { top: '59.5%', left: '74.5%', size: 27 },
      { top: '83.5%', left: '25.5%', size: 27 },
    ]);
  });

  it('pins the three Base resource slot centers', () => {
    expect(BASE_RESOURCE_SLOTS).toEqual([
      { top: '15%', left: '50%', size: 22 },
      { top: '85%', left: '35%', size: 22 },
      { top: '85%', left: '65%', size: 22 },
    ]);
  });
});

describe('forest slot tables', () => {
  it('pins the two Base trees', () => {
    expect(BASE_FOREST_SLOTS).toEqual([
      { top: '2%', left: '23%', size: '15%', z: 12 },
      { top: '11%', left: '23%', size: '15%', z: 14 },
    ]);
  });

  it('pins the single Special tree', () => {
    expect(SPECIAL_FOREST_SLOT).toEqual([{ top: '4px', left: '4px', size: '16%', z: 12 }]);
  });

  it('pins the grove: trees 1 and 2 at 24% from their side, tree 3 unchanged at left 44%', () => {
    expect(EMPTY_GROVE_SLOTS).toEqual([
      { top: '18%', left: '24%', size: '28%', z: 12 },
      { top: '24%', right: '24%', size: '28%', z: 14 },
      { bottom: '26%', left: '44%', size: '28%', z: 13 },
    ]);
  });
});
