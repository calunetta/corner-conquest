'use client';

import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { DecorationScenarioKey } from '@/modules/map';
import { TileDecorationEditorLayoutActions } from './TileDecorationEditorLayoutActions';
import { styles } from './TileDecorationEditor.styles';
import type { TileDecorationEditorViewModel } from './TileDecorationEditor.types';

export type TileDecorationEditorRailProps = Pick<
    TileDecorationEditorViewModel,
    | 'scenarioOptions'
    | 'artOptions'
    | 'artVariantId'
    | 'onArtVariantChange'
    | 'activeScenario'
    | 'activeVariant'
    | 'layouts'
    | 'activeLayoutId'
    | 'isDirty'
    | 'status'
    | 'canDeleteActiveLayout'
    | 'onScenarioChange'
    | 'onVariantChange'
    | 'onSelectLayout'
    | 'onAddLayout'
    | 'onDuplicateLayout'
    | 'onRenameLayout'
    | 'onDeleteLayout'
    | 'onSave'
  >;

/** Scenario and variant pickers, then the layout list for the chosen scenario/variant. */
export function TileDecorationEditorRail(props: TileDecorationEditorRailProps) {
  const { scenarioOptions, activeScenario, activeVariant, layouts, activeLayoutId, isDirty } = props;
  const activeOption = scenarioOptions.find((option) => option.key === activeScenario);
  const activeLayout = layouts.find((layout) => layout.id === activeLayoutId);
  const activeLayoutName = activeLayout?.name ?? '';

  return (
    <>
      <div className={styles.fieldRow}>
        <span className={styles.label}>Art variant</span>
        <Select value={props.artVariantId} onValueChange={props.onArtVariantChange}>
          <SelectTrigger aria-label="Art variant">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {props.artOptions.map((option) => (
              <SelectItem key={option.id} value={option.id}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className={styles.label}>Scenario</span>
        <Select value={activeScenario} onValueChange={props.onScenarioChange}>
          <SelectTrigger aria-label="Scenario">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {scenarioOptions.map((option) => (
              <SelectItem key={option.key} value={option.key}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {activeOption && activeOption.variants.length > 0 && (
        <div className={styles.fieldRow}>
          <span className={styles.label}>Variant</span>
          <Select
            value={activeVariant ?? undefined}
            onValueChange={(value) => props.onVariantChange(value as DecorationScenarioKey)}
          >
            <SelectTrigger aria-label="Variant">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {activeOption.variants.map((variant) => (
                <SelectItem key={variant.key} value={variant.key}>
                  {variant.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <h2 className={styles.panelTitle}>Layouts</h2>
      <div className={styles.layoutScroll}>
        <ul className={styles.layoutList}>
          {layouts.map((layout) => {
            const isActive = layout.id === activeLayoutId;
            return (
              <li key={layout.id}>
                <button
                  type="button"
                  className={styles.layoutRow({ isActive })}
                  aria-current={isActive ? 'true' : undefined}
                  onClick={() => props.onSelectLayout(layout.id)}
                >
                  <span>{layout.name}</span>
                  {isActive && isDirty && <Badge variant="outline" className={styles.unsavedBadge}>Unsaved changes</Badge>}
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <TileDecorationEditorLayoutActions
        isDirty={isDirty}
        status={props.status}
        canDeleteActiveLayout={props.canDeleteActiveLayout}
        scenarioLabel={activeOption ? activeOption.label : activeScenario}
        layoutName={activeLayoutName}
        onAddLayout={props.onAddLayout}
        onDuplicateLayout={props.onDuplicateLayout}
        onRenameLayout={props.onRenameLayout}
        onDeleteLayout={props.onDeleteLayout}
        onSave={props.onSave}
      />
    </>
  );
}
