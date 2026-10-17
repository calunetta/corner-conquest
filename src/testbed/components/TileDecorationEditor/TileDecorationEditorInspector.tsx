'use client';

import Image from 'next/image';
import { Trash2 } from 'lucide-react';
import { useState, type ChangeEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { DecorationInstance } from '@/modules/map';
import { toFileName } from './TileDecorationEditor.display.map';
import { styles } from './TileDecorationEditor.styles';
import { TileDecorationEditorImageDeleteButton } from './TileDecorationEditorImageDeleteButton';

const NO_IMAGES_TEXT = 'No images in public/sprites/decorations/ yet.';
const NO_SELECTION_TEXT = 'Click a decoration on the tile to edit it.';

interface TileDecorationEditorInspectorProps {
  images: string[];
  selectedInstance: DecorationInstance | null;
  onAddInstance: (image: string) => void;
  onResizeInstance: (instanceId: string, size: number) => void;
  onRelayerInstance: (instanceId: string, z: number) => void;
  onRemoveInstance: (instanceId: string) => void;
  isDirty: boolean;
  onDeleteImage: (image: string) => Promise<void>;
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
  isDirty,
  onDeleteImage,
}: TileDecorationEditorInspectorProps) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  return (
    <aside className={cn(styles.panel, styles.inspectorPanel)} aria-label="Decoration inspector">
      <h2 className={styles.panelTitle}>Decoration images</h2>
      {images.length === 0 ? (
        <p className={styles.emptyText}>{NO_IMAGES_TEXT}</p>
      ) : (
        <div className={styles.imageGrid}>
          {images.map((image) => (
            <button
              key={image}
              type="button"
              className={cn(styles.imageButton, selectedImage === image && styles.imageButtonSelected)}
              aria-label={toFileName(image)}
              aria-pressed={selectedImage === image}
              title={toFileName(image)}
              onClick={() => setSelectedImage(selectedImage === image ? null : image)}
            >
              <Image src={image} alt="" fill className={styles.imageThumbnail} unoptimized />
            </button>
          ))}
        </div>
      )}
      {selectedImage && (
        <div className={styles.imageActions}>
          <p className={styles.imageActionsName}>{toFileName(selectedImage)}</p>
          <Button type="button" size="sm" onClick={() => onAddInstance(selectedImage)}>
            Add to tile
          </Button>
          <TileDecorationEditorImageDeleteButton
            image={selectedImage}
            disabled={isDirty}
            onConfirm={(image) => {
              setSelectedImage(null);
              void onDeleteImage(image);
            }}
          />
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
        <input
          type="range"
          min={2}
          max={100}
          step={0.5}
          value={instance.size}
          aria-label="Size slider"
          className={styles.sizeSlider}
          onChange={(event: ChangeEvent<HTMLInputElement>) => onResize(Number(event.target.value))}
        />
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
      <p className={styles.emptyText}>Drag the decoration or anywhere on the tile to move it. Drag its corner to resize.</p>
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
