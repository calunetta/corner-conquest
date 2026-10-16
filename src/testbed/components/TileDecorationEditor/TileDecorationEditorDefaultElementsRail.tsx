'use client';

import { DEFAULT_ELEMENT_ROWS } from './TileDecorationEditor.defaultElements.map';
import { styles } from './TileDecorationEditor.styles';
import type { DefaultElementRowId, DefaultElementRowMeta } from './TileDecorationEditor.defaultElements.types';

interface TileDecorationEditorDefaultElementsRailProps {
  activeRowId: DefaultElementRowId;
  onSelectRow: (rowId: DefaultElementRowId) => void;
}

/** Groups DEFAULT_ELEMENT_ROWS by groupLabel, preserving the array's own order. */
function toRowGroups(rows: DefaultElementRowMeta[]): { groupLabel: string; rows: DefaultElementRowMeta[] }[] {
  const groups: { groupLabel: string; rows: DefaultElementRowMeta[] }[] = [];
  for (const row of rows) {
    const lastGroup = groups[groups.length - 1];
    if (lastGroup && lastGroup.groupLabel === row.groupLabel) {
      lastGroup.rows.push(row);
    } else {
      groups.push({ groupLabel: row.groupLabel, rows: [row] });
    }
  }
  return groups;
}

const ROW_GROUPS = toRowGroups(DEFAULT_ELEMENT_ROWS);

/** Replaces the Scenario/Variant/Layouts rail content with a grouped single-select list of the
 *  9 fixed default elements — there is exactly one instance of each, so no add/duplicate/rename/
 *  delete controls apply here. */
export function TileDecorationEditorDefaultElementsRail({
  activeRowId,
  onSelectRow,
}: TileDecorationEditorDefaultElementsRailProps) {
  return (
    <>
      <h2 className={styles.panelTitle}>Default elements</h2>
      <div className={styles.layoutScroll}>
        <div className={styles.layoutList}>
          {ROW_GROUPS.map((group) => (
            <div key={group.groupLabel}>
              <h3 className={styles.groupHeader}>{group.groupLabel}</h3>
              <ul className={styles.layoutList}>
                {group.rows.map((row) => {
                  const isActive = row.id === activeRowId;
                  return (
                    <li key={row.id}>
                      <button
                        type="button"
                        className={styles.layoutRow({ isActive })}
                        aria-current={isActive ? 'true' : undefined}
                        onClick={() => onSelectRow(row.id)}
                      >
                        <span>{row.rowLabel}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
