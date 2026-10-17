import { useCallback, type Dispatch, type SetStateAction } from 'react';
import type { DecorationLayoutsConfig } from '@/modules/map';
import type { TileVariantsConfig } from '@/modules/map/components/TileVariants/TileVariants.config';
import { removeImageFromLayouts, removeImageFromVariants } from '@/modules/map/decoration-image-cleanup.map';
import { deleteDecorationImage } from './TileDecorationEditor.service';

interface DecorationImageDeleteState {
  isDirty: boolean;
  setImages: Dispatch<SetStateAction<string[]>>;
  setBaseLayouts: Dispatch<SetStateAction<DecorationLayoutsConfig>>;
  setConfig: Dispatch<SetStateAction<DecorationLayoutsConfig>>;
  setTileConfig: Dispatch<SetStateAction<TileVariantsConfig>>;
  setSelectedInstanceId: (instanceId: string | null) => void;
}

/** Deletes a decoration image and every instance that draws it, then drops it from the in-memory copies
 *  the editor shows. Refused while there are unsaved edits, so no unsaved instance can point at the file. */
export function useDecorationImageDelete({
  isDirty,
  setImages,
  setBaseLayouts,
  setConfig,
  setTileConfig,
  setSelectedInstanceId,
}: DecorationImageDeleteState) {
  return useCallback(
    async (image: string) => {
      if (isDirty) return;
      await deleteDecorationImage(image);
      setImages((current) => current.filter((candidate) => candidate !== image));
      setBaseLayouts((current) => removeImageFromLayouts(current, image).config);
      setConfig((current) => removeImageFromLayouts(current, image).config);
      setTileConfig((current) => removeImageFromVariants(current, image).config);
      setSelectedInstanceId(null);
    },
    [isDirty, setImages, setBaseLayouts, setConfig, setTileConfig, setSelectedInstanceId],
  );
}
