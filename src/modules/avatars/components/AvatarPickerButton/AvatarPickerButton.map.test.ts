import { AVATAR_IDS, AVATAR_OPTIONS } from '../../avatar-catalog';
import { toAvatarCells } from './AvatarPickerButton.map';

describe('toAvatarCells', () => {
  it('returns one cell per catalog avatar (25)', () => {
    expect(toAvatarCells(null)).toHaveLength(25);
  });

  it('keeps catalog order, ids, sources and positions', () => {
    const cells = toAvatarCells(null);

    expect(cells.map((cell) => cell.id)).toEqual([...AVATAR_IDS]);
    expect(cells.map((cell) => cell.src)).toEqual(AVATAR_OPTIONS.map((option) => option.src));
    expect(cells.map((cell) => cell.position)).toEqual(Array.from({ length: 25 }, (_, i) => i + 1));
  });

  it('labels each cell "Avatar {position} of 25"', () => {
    const cells = toAvatarCells(null);

    expect(cells[0].ariaLabel).toBe('Avatar 1 of 25');
    expect(cells[2].ariaLabel).toBe('Avatar 3 of 25');
    expect(cells[24].ariaLabel).toBe('Avatar 25 of 25');
  });

  it('marks no cell selected when selectedId is null (empty selection)', () => {
    expect(toAvatarCells(null).filter((cell) => cell.isSelected)).toEqual([]);
  });

  it.each([
    ['human-01', 0], // boundary: first
    ['human-13', 12],
    ['human-25', 24], // boundary: last
  ] as const)('marks only %s as selected', (selectedId, index) => {
    const cells = toAvatarCells(selectedId);

    expect(cells.filter((cell) => cell.isSelected).map((cell) => cell.id)).toEqual([selectedId]);
    expect(cells[index].isSelected).toBe(true);
  });

  it('marks no cell selected for an id outside the catalog (invalid input)', () => {
    const cells = toAvatarCells('human-99' as never);

    expect(cells.filter((cell) => cell.isSelected)).toEqual([]);
  });
});
