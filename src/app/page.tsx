'use client';

import { useState } from 'react';
import { GameBoard } from '@/features/game/components/GameBoard';
import { Lobby } from '@/features/lobby/components/Lobby';
import { LobbyBackground } from '@/features/lobby/components/LobbyBackground';
import { usePlayer } from '@/hooks/use-player';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Loader2, Swords, Compass } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import Image from 'next/image';

function Login() {
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { setUsername, playerId } = usePlayer();
  const [showErrorDialog, setShowErrorDialog] = useState(false);

  const handleLogin = async () => {
    if (!name) return;
    setIsLoading(true);

    try {
      const success = await setUsername(name);
      if (!success) {
        setShowErrorDialog(true);
      }
    } catch (error) {
      console.error("Error logging in:", error);
      setShowErrorDialog(true);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="relative flex h-screen w-screen items-center justify-center p-4 overflow-hidden">
        <LobbyBackground />

        <Card className="z-10 w-full max-w-md bg-background/55 backdrop-blur-2xl border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.8)] overflow-hidden">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500/20 to-primary/20 border border-amber-500/30 shadow-inner">
              <Compass className="h-8 w-8 text-amber-400 animate-spin [animation-duration:20s]" />
            </div>
            <CardTitle className="text-2xl sm:text-3xl font-black tracking-wide bg-gradient-to-r from-amber-300 via-yellow-400 to-primary bg-clip-text text-transparent">
              Welcome to Corner Conquest
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm text-muted-foreground mt-1">
              Enter your commander name to enter the lobby and begin your archipelago conquest.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-2">
            <div className="grid w-full items-center gap-1.5">
              <Label htmlFor="username" className="text-xs font-semibold text-muted-foreground">
                Commander Name
              </Label>
              <Input
                type="text"
                id="username"
                placeholder="Your Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                className="bg-black/40 border-white/10 focus-visible:ring-amber-400 text-foreground"
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button
              className="w-full font-bold bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black shadow-[0_0_20px_rgba(245,158,11,0.4)] transition-all duration-300 hover:scale-[1.02] py-5"
              onClick={handleLogin}
              disabled={isLoading || !name.trim()}
            >
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Swords className="mr-2 h-4 w-4" />
              )}
              Enter Lobby
            </Button>
          </CardFooter>
        </Card>
      </div>

      <AlertDialog open={showErrorDialog} onOpenChange={setShowErrorDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Username Taken</AlertDialogTitle>
            <AlertDialogDescription>
              This username is already in use. Please choose a different one.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setShowErrorDialog(false)}>
              OK
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

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
