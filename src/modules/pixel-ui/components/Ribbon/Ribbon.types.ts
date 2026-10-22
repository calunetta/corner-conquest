import type { ReactNode } from 'react';

export type RibbonColor = 'blue' | 'red' | 'yellow';
export type RibbonHeading = 'div' | 'h2' | 'h3';

export interface RibbonProps {
  color?: RibbonColor;
  as?: RibbonHeading;
  /** Rendered before the text. */
  icon?: ReactNode;
  className?: string;
  /** One line; also set as the `title` attribute of the text span. */
  children: string;
}
