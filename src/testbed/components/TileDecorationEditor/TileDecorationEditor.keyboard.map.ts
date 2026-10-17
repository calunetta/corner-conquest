// Decides whether a key press should remove the selected decoration. Kept pure so the rule is tested without a DOM.

/** Keys that remove the selected decoration: Delete, and Backspace (the Mac key labelled "delete"). */
const REMOVE_KEYS = new Set(['Delete', 'Backspace']);

/** Typing keys stay with the field that has focus, so Backspace in a name or size box never deletes a decoration. */
export function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  // isContentEditable is not implemented in every DOM (jsdom), so the attribute is read too.
  const editable = target.isContentEditable || target.closest('[contenteditable]:not([contenteditable="false"])') !== null;
  if (editable) return true;
  return target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT';
}

export function isRemoveKeyPress(event: { key: string; target: EventTarget | null }): boolean {
  return REMOVE_KEYS.has(event.key) && !isTypingTarget(event.target);
}
