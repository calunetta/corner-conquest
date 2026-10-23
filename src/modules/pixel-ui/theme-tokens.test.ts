import { readFileSync } from 'fs';
import path from 'path';
import tailwindConfig from '../../../tailwind.config';

// Reads the source text instead of computing styles: jsdom does not load globals.css,
// and the rule under test is the literal token values in the file.
const GLOBALS_CSS = readFileSync(path.resolve(__dirname, '../../app/globals.css'), 'utf8');

/** Returns the text inside the first `{ ... }` block that starts at `selector`. */
function blockBody(css: string, selector: string): string {
  const start = css.indexOf(selector);
  if (start === -1) {
    throw new Error(`selector not found: ${selector}`);
  }
  const open = css.indexOf('{', start);
  let depth = 0;
  for (let i = open; i < css.length; i += 1) {
    if (css[i] === '{') depth += 1;
    if (css[i] === '}') depth -= 1;
    if (depth === 0) return css.slice(open + 1, i);
  }
  throw new Error(`unclosed block: ${selector}`);
}

/** Maps every `--name: value;` declaration in a block to its value (no `--` prefix). */
function readTokens(block: string): Record<string, string> {
  const tokens: Record<string, string> = {};
  for (const match of block.matchAll(/--([\w-]+):\s*([^;]+);/g)) {
    tokens[match[1]] = match[2].trim();
  }
  return tokens;
}

const DARK = readTokens(blockBody(GLOBALS_CSS, '.dark {'));
const ROOT = readTokens(blockBody(GLOBALS_CSS, ':root {'));

// Values from ui-design.md "Tokens" and plan.md step 1a.3. chart-* keep their previous values.
const EXPECTED_DARK_TOKENS: Array<[string, string]> = [
  ['background', '28 30% 9%'],
  ['foreground', '40 50% 94%'],
  ['card', '28 28% 14%'],
  ['card-foreground', '40 50% 94%'],
  ['popover', '28 30% 12%'],
  ['popover-foreground', '40 50% 94%'],
  ['primary', '195 55% 45%'],
  ['primary-foreground', '28 30% 9%'],
  ['secondary', '28 22% 22%'],
  ['secondary-foreground', '40 50% 94%'],
  ['muted', '28 18% 20%'],
  ['muted-foreground', '35 18% 72%'],
  ['accent', '42 90% 60%'],
  ['accent-foreground', '28 30% 9%'],
  ['destructive', '5 70% 55%'],
  ['destructive-foreground', '40 50% 94%'],
  ['border', '28 20% 28%'],
  ['input', '28 20% 28%'],
  ['ring', '42 90% 60%'],
  ['chart-1', '190 90% 50%'],
  ['chart-2', '260 50% 60%'],
  ['chart-3', '45 100% 55%'],
  ['chart-4', '340 80% 60%'],
  ['chart-5', '120 70% 50%'],
  ['sidebar-background', '28 28% 14%'],
  ['sidebar-foreground', '40 50% 94%'],
  ['sidebar-primary', '195 55% 45%'],
  ['sidebar-primary-foreground', '28 30% 9%'],
  ['sidebar-accent', '28 22% 22%'],
  ['sidebar-accent-foreground', '40 50% 94%'],
  ['sidebar-border', '28 20% 28%'],
  ['sidebar-ring', '42 90% 60%'],
  ['ink', '28 45% 16%'],
  ['paper', '40 55% 86%'],
];

describe('theme tokens in globals.css', () => {
  it.each(EXPECTED_DARK_TOKENS)('.dark --%s is %s', (name, value) => {
    expect(DARK[name]).toBe(value);
  });

  it('defines --ink and --paper inside .dark only', () => {
    expect(DARK.ink).toBe('28 45% 16%');
    expect(DARK.paper).toBe('40 55% 86%');
    expect(ROOT.ink).toBeUndefined();
    expect(ROOT.paper).toBeUndefined();
  });

  it('keeps the light :root block untouched', () => {
    expect(ROOT.background).toBe('0 0% 100%');
    expect(ROOT.foreground).toBe('0 0% 3.9%');
    expect(ROOT.primary).toBe('231 48% 48%');
    expect(ROOT.accent).toBe('55 97% 61%');
  });
});

describe('plain body rule removed', () => {
  const beforeFirstLayer = GLOBALS_CSS.slice(0, GLOBALS_CSS.indexOf('@layer base'));

  it('has no body rule before the first @layer base', () => {
    expect(beforeFirstLayer).not.toMatch(/body\s*\{/);
  });

  it('has no hard-coded font-family declaration', () => {
    expect(GLOBALS_CSS).not.toMatch(/font-family\s*:/);
  });
});

describe('tailwind font families and colors', () => {
  const fontFamily = tailwindConfig.theme.extend.fontFamily;
  const colors = tailwindConfig.theme.extend.colors;

  it('readable and body start with Patrick Hand, then Lato', () => {
    expect(fontFamily.readable.slice(0, 2)).toEqual(['var(--font-patrick)', 'var(--font-lato)']);
    expect(fontFamily.body).toEqual(fontFamily.readable);
  });

  it('headline, pixel and medieval start with MedievalSharp', () => {
    for (const family of [fontFamily.headline, fontFamily.pixel, fontFamily.medieval]) {
      expect(family[0]).toBe('var(--font-medieval)');
    }
  });

  it('exposes ink and paper colours backed by the CSS variables', () => {
    expect(colors.ink).toBe('hsl(var(--ink))');
    expect(colors.paper).toBe('hsl(var(--paper))');
  });
});
