import type { PreviewState } from '../../testbed.types';

/** All states, or only the one named in `?state=` (case-insensitive). */
export function selectStates(states: PreviewState[], stateName?: string): PreviewState[] {
  if (!stateName) return states;

  const wanted = stateName.toLowerCase();
  return states.filter((state) => state.name.toLowerCase() === wanted);
}

/** "Zoomed in" → "zoomed-in", for stable data-testid values. */
export function toKebabCase(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}
