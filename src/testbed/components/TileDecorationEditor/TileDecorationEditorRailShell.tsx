'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { styles } from './TileDecorationEditor.styles';
import { TileDecorationEditorModeTabsBar } from './TileDecorationEditorModeTabsBar';
import type { EditorMode } from './TileDecorationEditor.types';

interface TileDecorationEditorRailShellProps {
  mode: EditorMode;
  onModeChange: (mode: EditorMode) => void;
  children: ReactNode;
}

/** The rail's own <aside> plus the mode Tabs, shared by both modes' rail content so the Tabs
 *  always sit in the same md:w-56 column no matter which rail is showing. */
export function TileDecorationEditorRailShell({ mode, onModeChange, children }: TileDecorationEditorRailShellProps) {
  return (
    <aside className={cn(styles.panel, styles.railPanel)} aria-label="Editor mode and scenario">
      <TileDecorationEditorModeTabsBar mode={mode} onModeChange={onModeChange} />
      {children}
    </aside>
  );
}
