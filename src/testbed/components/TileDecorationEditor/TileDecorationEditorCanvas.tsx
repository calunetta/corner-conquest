'use client';

import type { DecorationInstance, DecorationScenarioKey } from '@/modules/map';
import { toDecorationAriaLabel, toDecorationSpriteStyle } from './TileDecorationEditor.map';
import { toReferenceIsland } from './TileDecorationEditor.display.map';
import { styles } from './TileDecorationEditor.styles';
import { TileDecorationEditorReferenceTile } from './TileDecorationEditorReferenceTile';
import { TileDecorationEditorSprite } from './TileDecorationEditorSprite';

const EMPTY_LAYOUT_HINT = 'No decorations — pick an image to add one';

interface TileDecorationEditorCanvasProps {
  scenarioKey: DecorationScenarioKey;
  instances: DecorationInstance[];
  selectedInstanceId: string | null;
  onSelectInstance: (instanceId: string) => void;
  onDragInstance: (instanceId: string, top: number, left: number) => void;
  onNudgeInstance: (instanceId: string, dTop: number, dLeft: number) => void;
}

/** The realistic tile, with its own decoration layer hidden (see styles.tileFrame) and the editor's
 *  draggable sprites drawn in its place at the same z-[12] slot. */
export function TileDecorationEditorCanvas({
  scenarioKey,
  instances,
  selectedInstanceId,
  onSelectInstance,
  onDragInstance,
  onNudgeInstance,
}: TileDecorationEditorCanvasProps) {
  const island = toReferenceIsland(scenarioKey);

  return (
    <div className={styles.tileFrame}>
      <TileDecorationEditorReferenceTile island={island} />
      <div className={styles.decorationOverlay}>
        {instances.map((instance, index) => (
          <TileDecorationEditorSprite
            key={instance.id}
            image={instance.image}
            ariaLabel={toDecorationAriaLabel(instance, index, instances.length)}
            style={toDecorationSpriteStyle(instance)}
            isSelected={instance.id === selectedInstanceId}
            onSelect={() => onSelectInstance(instance.id)}
            onDrag={(top, left) => onDragInstance(instance.id, top, left)}
            onNudge={(dTop, dLeft) => onNudgeInstance(instance.id, dTop, dLeft)}
          />
        ))}
      </div>
      {instances.length === 0 && <p className={styles.emptyHint}>{EMPTY_LAYOUT_HINT}</p>}
    </div>
  );
}
