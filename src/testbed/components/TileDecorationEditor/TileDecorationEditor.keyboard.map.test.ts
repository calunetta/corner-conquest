import { isRemoveKeyPress } from './TileDecorationEditor.keyboard.map';

describe('isRemoveKeyPress', () => {
  it('removes the selected decoration on Delete and Backspace outside a text field', () => {
    const board = document.createElement('div');

    expect(isRemoveKeyPress({ key: 'Delete', target: board })).toBe(true);
    expect(isRemoveKeyPress({ key: 'Backspace', target: board })).toBe(true);
  });

  it('leaves Backspace to text fields, selects and editable text', () => {
    const input = document.createElement('input');
    const textarea = document.createElement('textarea');
    const select = document.createElement('select');
    const editable = document.createElement('div');
    editable.setAttribute('contenteditable', 'true');

    expect(isRemoveKeyPress({ key: 'Backspace', target: input })).toBe(false);
    expect(isRemoveKeyPress({ key: 'Delete', target: textarea })).toBe(false);
    expect(isRemoveKeyPress({ key: 'Delete', target: select })).toBe(false);
    expect(isRemoveKeyPress({ key: 'Delete', target: editable })).toBe(false);
  });

  it('ignores other keys', () => {
    expect(isRemoveKeyPress({ key: 'Enter', target: document.body })).toBe(false);
  });
});
