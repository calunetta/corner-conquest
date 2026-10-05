import { readFileSync } from 'fs';
import { globSync } from 'glob';
import { resolve } from 'path';

/**
 * Regression test for z-index scale compliance.
 *
 * The z-index stacking order in IslandTile and its children (TileBoats, TileResources,
 * TileForest, MapDecorations, TileOccupants, etc.) must use only Tailwind's default
 * zIndex scale: [0, 10, 20, 30, 40, 50, auto].
 *
 * Bare numeric z-<n> classes outside this scale (e.g., z-5, z-12, z-25, z-26, z-28, z-35)
 * are not recognized by Tailwind 3's JIT compiler and compile to no CSS rule.
 * The element keeps other classes (like `position: absolute`) from the same string,
 * but has no z-index declaration, leaving it at z-index: auto. This causes stacking defects,
 * especially when a sibling has an explicit z-10 or higher.
 *
 * This test scans every *.styles.ts file under src/modules/map/components/ and fails
 * if any z-<token> class is found where <token> is a bare integer not in the valid scale.
 * Bracketed arbitrary values (z-[...]) and z-auto are always allowed.
 *
 * Root cause: https://github.com/tailwindlabs/tailwindcss/issues/... (silent skip of unknown JIT classes)
 */

describe('Map z-index scale compliance', () => {
  const VALID_Z_VALUES = new Set([0, 10, 20, 30, 40, 50]);
  const BASE_DIR = process.cwd();
  const GLOB_PATTERN = 'src/modules/map/components/**/*.styles.ts';

  it('should not use bare z-<n> classes outside the valid Tailwind scale', () => {
    const filePaths = globSync(GLOB_PATTERN);

    if (filePaths.length === 0) {
      throw new Error(`No .styles.ts files found matching ${GLOB_PATTERN}`);
    }

    const violations: Array<{ file: string; token: string; fullMatch: string }> = [];

    for (const filePath of filePaths) {
      const fullPath = resolve(BASE_DIR, filePath);
      const content = readFileSync(fullPath, 'utf-8');

      // Match z-<token> where token is:
      // - [...]  (bracketed arbitrary value, always allowed)
      // - auto   (always allowed)
      // - -?\d+  (bare number, may be invalid)
      const regex = /\bz-(\[[^\]]+\]|auto|-?\d+)\b/g;
      let match;

      while ((match = regex.exec(content)) !== null) {
        const token = match[1];
        const fullMatch = match[0];

        // Skip bracketed values and auto
        if (token.startsWith('[') || token === 'auto') {
          continue;
        }

        // Extract bare integer
        const value = Number(token);
        if (!isNaN(value) && !VALID_Z_VALUES.has(value)) {
          violations.push({ file: filePath, token, fullMatch });
        }
      }
    }

    if (violations.length > 0) {
      const violationList = violations
        .map(
          (v) =>
            `  ${v.file}: found ${v.fullMatch} (value ${v.token} not in [${Array.from(VALID_Z_VALUES).sort((a, b) => a - b).join(', ')}])`
        )
        .join('\n');

      throw new Error(
        `Found ${violations.length} z-index scale violation(s) in src/modules/map/components:\n${violationList}\n\nFix: use bracketed arbitrary values instead, e.g., z-5 → z-[5]`
      );
    }
  });

  it('should allow valid z-index values and bracketed arbitrary values', () => {
    // This is a sanity check that our regex and logic are correct.
    // We test against known-good files (that use only valid z values or brackets).

    const VALID_CLASSES = [
      'z-0 z-10 z-20 z-30 z-40 z-50', // valid bare values
      'z-auto', // auto is always valid
      'z-[5] z-[12] z-[25] z-[26] z-[28] z-[35]', // bracketed arbitrary (always valid)
      'z-[100] z-[-1]', // bracketed negatives and non-scale values
    ];

    const INVALID_CLASSES = ['z-5', 'z-12', 'z-25', 'z-26', 'z-28', 'z-35', 'z-1', 'z-15', 'z-99'];

    const regex = /\bz-(\[[^\]]+\]|auto|-?\d+)\b/g;
    const validZValues = new Set([0, 10, 20, 30, 40, 50]);

    // Verify valid classes don't trigger violations
    for (const classStr of VALID_CLASSES) {
      const violations: string[] = [];
      let match;
      const localRegex = new RegExp(regex.source, 'g');
      while ((match = localRegex.exec(classStr)) !== null) {
        const token = match[1];
        if (!token.startsWith('[') && token !== 'auto') {
          const value = Number(token);
          if (!isNaN(value) && !validZValues.has(value)) {
            violations.push(token);
          }
        }
      }
      expect(violations).toEqual([]);
    }

    // Verify invalid classes DO trigger violations
    for (const classStr of INVALID_CLASSES) {
      const violations: string[] = [];
      let match;
      const localRegex = new RegExp(regex.source, 'g');
      while ((match = localRegex.exec(classStr)) !== null) {
        const token = match[1];
        if (!token.startsWith('[') && token !== 'auto') {
          const value = Number(token);
          if (!isNaN(value) && !validZValues.has(value)) {
            violations.push(token);
          }
        }
      }
      expect(violations.length).toBeGreaterThan(0);
    }
  });
});
