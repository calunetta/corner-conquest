'use client';

import type { LabIslandType, LabResourceKey } from './IslandTile.preview.slot-lab.types';

const LAB_CORNER_LABELS = ['br — blue', 'tr — red', 'tl — purple', 'bl — yellow'];

interface SlotLabControlsProps {
  islandType: LabIslandType;
  onIslandTypeChange: (value: LabIslandType) => void;
  treeCount: 2 | 3;
  onTreeCountChange: (value: 2 | 3) => void;
  amounts: Record<LabResourceKey, 0 | 1 | 2>;
  onAmountChange: (key: LabResourceKey, value: 0 | 1 | 2) => void;
  farmed: Record<LabResourceKey, boolean>;
  onFarmedChange: (key: LabResourceKey, value: boolean) => void;
  farmingCorner: Record<LabResourceKey, number>;
  onFarmingCornerChange: (key: LabResourceKey, value: number) => void;
  occupantCount: number;
  onOccupantCountChange: (value: number) => void;
  totalNodes: number;
}

/** The left-side form for IslandTileSlotLab's interactive preview state, split out to stay
 *  under max-lines. Pure presentation - all state lives in the parent. */
export function SlotLabControls({
  islandType,
  onIslandTypeChange,
  treeCount,
  onTreeCountChange,
  amounts,
  onAmountChange,
  farmed,
  onFarmedChange,
  farmingCorner,
  onFarmingCornerChange,
  occupantCount,
  onOccupantCountChange,
  totalNodes,
}: SlotLabControlsProps) {
  return (
    <div className="flex w-72 flex-col gap-4 text-sm text-white/80">
      <label className="flex flex-col gap-1">
        Island type
        <select
          className="rounded border border-white/20 bg-black/40 px-2 py-1"
          value={islandType}
          onChange={(e) => onIslandTypeChange(e.target.value as LabIslandType)}
        >
          <option value="empty">Empty</option>
          <option value="base">Base</option>
          <option value="resource">Resource</option>
          <option value="special">Special</option>
        </select>
      </label>

      {islandType === 'empty' && (
        <label className="flex flex-col gap-1">
          Tree count (grove)
          <select
            className="rounded border border-white/20 bg-black/40 px-2 py-1"
            value={treeCount}
            onChange={(e) => onTreeCountChange(Number(e.target.value) as 2 | 3)}
          >
            <option value={2}>2</option>
            <option value={3}>3</option>
          </select>
        </label>
      )}

      {(islandType === 'base' || islandType === 'resource') && (
        <fieldset className="flex flex-col gap-2 rounded border border-white/20 p-2">
          <legend className="px-1 text-xs uppercase tracking-wide text-white/50">
            Resources ({totalNodes} node{totalNodes === 1 ? '' : 's'} total — real max is 4)
          </legend>
          {(['food', 'wood', 'gold'] as LabResourceKey[]).map((key) => (
            <div key={key} className="flex flex-col gap-1 border-b border-white/10 pb-2 last:border-0 last:pb-0">
              <div className="flex items-center justify-between gap-2">
                <span className="w-12 capitalize">{key}</span>
                <select
                  className="rounded border border-white/20 bg-black/40 px-2 py-1"
                  value={amounts[key]}
                  onChange={(e) => onAmountChange(key, Number(e.target.value) as 0 | 1 | 2)}
                >
                  <option value={0}>0</option>
                  <option value={1}>1</option>
                  <option value={2}>2</option>
                </select>
                <label className="flex items-center gap-1">
                  <input
                    type="checkbox"
                    disabled={amounts[key] === 0}
                    checked={farmed[key]}
                    onChange={(e) => onFarmedChange(key, e.target.checked)}
                  />
                  farmed
                </label>
              </div>
              {farmed[key] && amounts[key] > 0 && (
                <label className="flex items-center justify-between gap-2 pl-14 text-xs text-white/60">
                  farmed by
                  <select
                    className="rounded border border-white/20 bg-black/40 px-2 py-1"
                    value={farmingCorner[key]}
                    onChange={(e) => onFarmingCornerChange(key, Number(e.target.value))}
                  >
                    {LAB_CORNER_LABELS.map((label, idx) => (
                      <option key={label} value={idx}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>
          ))}
        </fieldset>
      )}

      <label className="flex flex-col gap-1">
        Occupants (knights) — fills br, tr, tl, bl in order
        <select
          className="rounded border border-white/20 bg-black/40 px-2 py-1"
          value={occupantCount}
          onChange={(e) => onOccupantCountChange(Number(e.target.value))}
        >
          {[0, 1, 2, 3, 4].map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </label>

      <p className="text-xs text-white/50">
        A corner marked “farmed by” loses its idle-in-boat collector (TileBoats) and gains the
        farming badge on the resource node (TileResources) — the same trade the real game makes.
      </p>
    </div>
  );
}
