import { useEffect } from 'react';
import { isRemoveKeyPress } from './TileDecorationEditor.keyboard.map';

/** While the decorations mode has a selected decoration, Delete or Backspace removes it from the tile. */
export function useRemoveSelectedWithKeyboard(enabled: boolean, onRemove: () => void) {
  useEffect(() => {
    if (!enabled) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isRemoveKeyPress(event)) return;
      event.preventDefault();
      onRemove();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled, onRemove]);
}
