// Shared by TileDecorationEditor.hook.ts and TileDecorationEditor.layouts.hook.ts: both create new
// layout/instance ids outside React state, so this can't live in TileDecorationEditor.map.ts
// (Date.now()/Math.random() are forbidden there — see component-architecture's `.map.ts` rules).
export function createId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
