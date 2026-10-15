'use client';

import Image from 'next/image';
import { Trash2 } from 'lucide-react';
import type { ChangeEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { DecorationInstance } from '@/modules/map';
import { toFileName } from './TileDecorationEditor.display.map';
import { styles } from './TileDecorationEditor.styles';

const NO_IMAGES_TEXT = 'No images in public/sprites/decorations/ yet.';
const NO_SELECTION_TEXT = 'Click a decoration on the tile to edit it.';

interface TileDecorationEditorInspectorProps {
  images: string[];
  selectedInstance: DecorationInstance | null;
  onAddInstance: (image: string) => void;
  onResizeInstance: (instanceId: string, size: number) => void;
  onRelayerInstance: (instanceId: string, z: number) => void;
  onRemoveInstance: (instanceId: string) => void;
}

/** Image picker (adds an instance) and the selected instance's fields. The image grid lives in the
 *  inspector so every pick lands in the active layout the canvas is showing. */
export function TileDecorationEditorInspector({
  images,
  selectedInstance,
  onAddInstance,
  onResizeInstance,
  onRelayerInstance,
  onRemoveInstance,
}: TileDecorationEditorInspectorProps) {
  return (
    <aside className={cn(styles.panel, styles.inspectorPanel)} aria-label="Decoration inspector">
      <h2 className={styles.panelTitle}>Decoration images</h2>
      {images.length === 0 ? (
        <p className={styles.emptyText}>{NO_IMAGES_TEXT}</p>
      ) : (
        <div className={styles.imageGrid}>
          {images.map((image) => (
            <Tooltip key={image}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className={styles.imageButton}
                  aria-label={`Add ${toFileName(image)}`}
                  onClick={() => onAddInstance(image)}
                >
                  <Image src={image} alt="" fill className={styles.imageThumbnail} unoptimized />
                </button>
              </TooltipTrigger>
              <TooltipContent>{`Add ${toFileName(image)}`}</TooltipContent>
            </Tooltip>
          ))}
        </div>
      )}

      <h2 className={styles.panelTitle}>Selected decoration</h2>
      {selectedInstance ? (
        <SelectedInstanceFields
          instance={selectedInstance}
          onResize={(size) => onResizeInstance(selectedInstance.id, size)}
          onRelayer={(z) => onRelayerInstance(selectedInstance.id, z)}
          onRemove={() => onRemoveInstance(selectedInstance.id)}
        />
      ) : (
        <p className={styles.emptyText}>{NO_SELECTION_TEXT}</p>
      )}
    </aside>
  );
}

interface SelectedInstanceFieldsProps {
  instance: DecorationInstance;
  onResize: (size: number) => void;
  onRelayer: (z: number) => void;
  onRemove: () => void;
}

function SelectedInstanceFields({ instance, onResize, onRelayer, onRemove }: SelectedInstanceFieldsProps) {
  return (
    <div className={styles.fieldStack}>
      <div className={styles.instanceFields}>
        <label className={styles.fieldRow}>
          <span className={styles.label}>Size (% of tile)</span>
          <Input
            type="number"
            min={0}
            max={100}
            step={0.5}
            value={instance.size}
            onChange={(event: ChangeEvent<HTMLInputElement>) => onResize(Number(event.target.value))}
          />
        </label>
        <label className={styles.fieldRow}>
          <span className={styles.label}>Layer (z-index)</span>
          <Input
            type="number"
            step={1}
            value={instance.z}
            onChange={(event: ChangeEvent<HTMLInputElement>) => onRelayer(Number(event.target.value))}
          />
        </label>
      </div>
      <p className={styles.readout}>
        Top {instance.top.toFixed(1)}%, left {instance.left.toFixed(1)}%
      </p>
      <Button type="button" variant="outline" size="sm" onClick={onRemove}>
        <Trash2 className={styles.icon} aria-hidden />
        Remove
      </Button>
    </div>
  );
}
