import type { ComponentPreview } from '@/testbed';
import { LobbyBackground } from './LobbyBackground';

/**
 * LobbyBackground is `fixed inset-0`, so it would escape the testbed canvas and cover the whole page.
 * `transform-gpu` makes this wrapper the containing block for the fixed root, keeping the stage inside the preview.
 */
function LobbyBackgroundStage() {
  return (
    <div className="relative h-[520px] w-full overflow-hidden transform-gpu">
      <LobbyBackground />
    </div>
  );
}

export const lobbyBackgroundPreview: ComponentPreview = {
  slug: 'lobby-background',
  title: 'Lobby Background',
  group: 'Lobby',
  states: [{ name: 'Default', render: () => <LobbyBackgroundStage /> }],
};
