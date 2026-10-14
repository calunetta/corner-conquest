import type { ComponentPreview } from '@/testbed';
import { GameBoardSandbox } from './GameBoardSandbox';

export const gameBoardSandboxPreview: ComponentPreview = {
  slug: 'game-board-position-race-sandbox',
  title: 'Game Board — Position Race Sandbox',
  group: 'Game Board',
  states: [
    {
      name: 'Interactive',
      // GameBoard's 3-column layout switches at Tailwind's lg: *viewport* breakpoint, which
      // doesn't know the shared PreviewStage canvas is narrower (max-w-5xl) — without an
      // explicit width here the columns overlap instead of sitting side by side. The canvas
      // already scrolls horizontally (PreviewStage.styles.ts `canvas: overflow-x-auto`), so a
      // wide fixed-width wrapper here, not a PreviewStage change, is the fix.
      render: () => (
        <div className="min-w-[1400px]">
          <GameBoardSandbox />
        </div>
      ),
    },
  ],
};
