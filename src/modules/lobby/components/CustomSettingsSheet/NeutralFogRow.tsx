'use client';

import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { styles } from './CustomSettingsSheet.styles';

export interface NeutralFogRowProps {
  checked: boolean;
  disabled: boolean;
  onCheckedChange: (checked: boolean) => void;
}

/** Sits under the fog switch: covered tiles fog over plain grey instead of their terrain colour. */
export function NeutralFogRow({ checked, disabled, onCheckedChange }: NeutralFogRowProps) {
  return (
    <div className={styles.fogSection}>
      <div className="space-y-0.5">
        <Label htmlFor="neutral-fog">Neutral fog colour</Label>
        <p className={styles.fogDescription}>
          Covered tiles show plain grey fog instead of their terrain colour, so the fog hides the tile type.
        </p>
      </div>
      <Switch id="neutral-fog" checked={checked} disabled={disabled} onCheckedChange={onCheckedChange} />
    </div>
  );
}
