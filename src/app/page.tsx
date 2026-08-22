
'use client';
import { useState } from 'react';
import { GameBoard } from '@/features/game/components/GameBoard';
import { Lobby } from '@/features/lobby/components/Lobby';
import { usePlayer } from '@/hooks/use-player';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

function Login() {
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] =useState(false);
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
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle>Welcome to Corner Conquest</CardTitle>
            <CardDescription>Enter a username to begin.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid w-full items-center gap-1.5">
              <Label htmlFor="username">Username</Label>
              <Input
                type="text"
                id="username"
                placeholder="Your Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button className="w-full" onClick={handleLogin} disabled={isLoading || !name || !playerId}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
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
  }

  return (
    <div className="flex h-screen w-screen flex-col bg-background text-foreground">
      {activeGameId ? (
        <GameBoard gameId={activeGameId} onExit={handleExitGame} />
      ) : (
        <Lobby onJoinGame={setActiveGameId} />
      )}
    </div>
  );
}
