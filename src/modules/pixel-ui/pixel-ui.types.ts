/** A run of source pixels on one axis of a sprite sheet. */
export interface SliceSpan {
  readonly start: number;
  readonly size: number;
}

/** Space (source px) between the frame edge and its content. */
export interface FrameInset {
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
  readonly left: number;
}

interface SheetBase {
  /** Already encoded, from assetUrl(). */
  readonly url: string;
  /** Whole sheet, px. */
  readonly width: number;
  readonly height: number;
  readonly inset: FrameInset;
}

export interface NineSliceSheet extends SheetBase {
  /** Left, middle, right. */
  readonly cols: readonly [SliceSpan, SliceSpan, SliceSpan];
  /** Top, middle, bottom. */
  readonly rows: readonly [SliceSpan, SliceSpan, SliceSpan];
}

export interface ThreeSliceSheet extends SheetBase {
  readonly cols: readonly [SliceSpan, SliceSpan, SliceSpan];
  /** Single row; frame height is fixed. */
  readonly rows: readonly [SliceSpan];
}

export type SliceSheet = NineSliceSheet | ThreeSliceSheet;

export type SliceScale = 1 | 2;

export interface SliceCell {
  /** 'r0c0' ... row-major. */
  readonly key: string;
  readonly style: {
    backgroundImage: string;
    backgroundSize: string;
    backgroundPosition: string;
  };
}

export interface SliceGrid {
  /** e.g. '84px 1fr 84px'. */
  readonly columns: string;
  /** e.g. '85px 1fr 103px' or '61px'. */
  readonly rows: string;
  /** 9 or 3, row-major. */
  readonly cells: readonly SliceCell[];
  /** (left + right) * scale. */
  readonly minWidth: number;
  /** (top + bottom) * scale for 9-slice; row size * scale for 3-slice. */
  readonly minHeight: number;
  /** Row size * scale for 3-slice, else null. */
  readonly fixedHeight: number | null;
}
