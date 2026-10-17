'use client';

import { useState } from 'react';
import { GameBoard } from '@/features/game/components/GameBoard';
import { AdSlot } from '@/modules/ads';
import { Lobby, LobbyBackground } from '@/modules/lobby';
import { Login, usePlayer } from '@/modules/session';

export default function Home() {
  const { playerId, username } = usePlayer();
  const [activeGameId, setActiveGameId] = useState<string | null>(null);

  const isSignedIn = Boolean(username && playerId);

  const handleExitGame = () => {
    setActiveGameId(null);
  };

  const renderScreen = () => {
    if (!isSignedIn) {
      return <Login />;
    }
    if (activeGameId) {
      return <GameBoard gameId={activeGameId} onExit={handleExitGame} />;
    }
    return (
      <>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <Lobby onJoinGame={setActiveGameId} />
        </div>
        <div className="shrink-0">
          <AdSlot />
        </div>
      </>
    );
  };

  // One return for every screen: LobbyBackground keeps the same position among these children,
  // so it is not unmounted when Login hands over to Lobby. It is hidden only while a game board is shown.
  return (
    <div className="relative flex h-screen w-screen flex-col bg-gradient-to-br from-background via-indigo-950/20 to-background bg-[length:200%_200%] text-foreground overflow-hidden">
      {!activeGameId && <LobbyBackground />}
      <div className="z-10 flex h-full w-full flex-col">{renderScreen()}</div>
    </div>
  );
}
