'use client';

import type { DecorationInstance, DecorationScenarioKey } from '@/modules/map';
import { toDecorationAriaLabel, toDecorationSpriteStyle } from './TileDecorationEditor.map';
import { toReferenceIsland } from './TileDecorationEditor.display.map';
import { styles } from './TileDecorationEditor.styles';
import { TileDecorationEditorReferenceTile } from './TileDecorationEditorReferenceTile';
import type { TileImage, TileVariant } from '@/modules/map/components/TileVariants/TileVariants.config';
import { TileDecorationEditorSprite } from './TileDecorationEditorSprite';
import { TileDecorationEditorDragLayer, TileDecorationEditorResizeHandle } from './TileDecorationEditorGestures';

const EMPTY_LAYOUT_HINT = 'No decorations — pick an image to add one';

interface TileDecorationEditorCanvasProps {
  scenarioKey: DecorationScenarioKey;
  instances: DecorationInstance[];
  selectedInstanceId: string | null;
  onSelectInstance: (instanceId: string) => void;
  onDragInstance: (instanceId: string, top: number, left: number) => void;
  onNudgeInstance: (instanceId: string, dTop: number, dLeft: number) => void;
  onResizeInstance: (instanceId: string, size: number) => void;
  /** The art variant the tile is drawn with; null draws the built-in art. */
  artVariant: TileVariant | null;
  artImages: TileImage[];
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
  onResizeInstance,
  artVariant,
  artImages,
}: TileDecorationEditorCanvasProps) {
  const island = toReferenceIsland(scenarioKey);
  const selectedInstance = instances.find((instance) => instance.id === selectedInstanceId) ?? null;

  return (
    <div className={styles.tileFrame}>
      <TileDecorationEditorReferenceTile island={island} artVariant={artVariant} artImages={artImages} />
      <div className={styles.decorationOverlay}>
        {selectedInstance && (
          <TileDecorationEditorDragLayer
            instance={selectedInstance}
            onDrag={(top, left) => onDragInstance(selectedInstance.id, top, left)}
          />
        )}
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
        {selectedInstance && (
          <TileDecorationEditorResizeHandle
            instance={selectedInstance}
            onResize={(size) => onResizeInstance(selectedInstance.id, size)}
          />
        )}
      </div>
      {instances.length === 0 && <p className={styles.emptyHint}>{EMPTY_LAYOUT_HINT}</p>}
    </div>
  );
}
