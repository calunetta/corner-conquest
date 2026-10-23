import type { ComponentPropsWithoutRef, ReactNode } from 'react';

export type RibbonColor = 'blue' | 'red' | 'yellow';
export type RibbonHeading = 'div' | 'h2' | 'h3';

export interface RibbonProps
  extends Omit<ComponentPropsWithoutRef<'h2'>, 'color' | 'children' | 'className'> {
  color?: RibbonColor;
  as?: RibbonHeading;
  /** Rendered before the text. */
  icon?: ReactNode;
  /** Goes to the frame (ThreeSlice), not the text element. */
  className?: string;
  /** One line. A string is also set as the `title` attribute unless `title` is passed. */
  children: ReactNode;
}
