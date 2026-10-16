'use client';

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { styles } from './TileDecorationEditor.styles';
import type { EditorMode } from './TileDecorationEditor.types';

interface TileDecorationEditorModeTabsBarProps {
  mode: EditorMode;
  onModeChange: (mode: EditorMode) => void;
}

/** Switches the rail/canvas/inspector between the existing Decorations editor and the new
 *  Default-elements editor. Radix Tabs provides role="tablist"/role="tab"/aria-selected and
 *  roving tabindex, so no extra accessibility work is needed here. */
export function TileDecorationEditorModeTabsBar({ mode, onModeChange }: TileDecorationEditorModeTabsBarProps) {
  return (
    <Tabs value={mode} onValueChange={(value) => onModeChange(value as EditorMode)}>
      <TabsList className={styles.modeTabsList}>
        <TabsTrigger value="decorations" className={styles.modeTabsTrigger}>
          Decorations
        </TabsTrigger>
        <TabsTrigger value="default-elements" className={styles.modeTabsTrigger}>
          Default elements
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
