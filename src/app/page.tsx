'use client';

import { useState } from 'react';
import { GameBoard } from '@/features/game/components/GameBoard';
import { Lobby } from '@/modules/lobby';
import { Login, usePlayer } from '@/modules/session';

export default function Home() {
  const { playerId, username } = usePlayer();
  const [activeGameId, setActiveGameId] = useState<string | null>(null);

  if (!username || !playerId) {
    return <Login />;
  }

  const handleExitGame = () => {
    setActiveGameId(null);
  };

  return (
    <div className="relative flex h-screen w-screen flex-col bg-gradient-to-br from-background via-indigo-950/20 to-background bg-[length:200%_200%] text-foreground overflow-hidden">
      <div className="z-10 flex h-full w-full flex-col">
        {activeGameId ? (
          <GameBoard gameId={activeGameId} onExit={handleExitGame} />
        ) : (
          <Lobby onJoinGame={setActiveGameId} />
        )}
      </div>
    </div>
  );
}
