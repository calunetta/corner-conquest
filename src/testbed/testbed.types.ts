import type { ReactNode } from 'react';

/** One visual state of a component, e.g. "Default" or "Expiring". */
export interface PreviewState {
  name: string;
  render: () => ReactNode;
}

/** Every state of one component, shown together at /testbed/<slug>. */
export interface ComponentPreview {
  /** Unique kebab-case id, used in the URL. */
  slug: string;
  title: string;
  /** Catalog section, e.g. "HUD" or "Legacy / Game map". */
  group: string;
  states: PreviewState[];
}
