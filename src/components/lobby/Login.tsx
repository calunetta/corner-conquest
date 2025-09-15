'use client';
import { useState } from 'react';
import { usePlayer } from '@/hooks/use-player';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function Login() {
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { setUsername } = usePlayer();
  const { toast } = useToast();

  const handleLogin = async () => {
    if (!name) return;
    setIsLoading(true);
    const success = await setUsername(name);
    if (!success) {
      toast({
        title: 'Username Taken',
        description: 'This username is already in use. Please choose another one.',
        variant: 'destructive',
      });
    }
    // On success, the parent component will automatically render the lobby.
    setIsLoading(false);
  };

  return (
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
          <Button className="w-full" onClick={handleLogin} disabled={isLoading || !name}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Enter Lobby
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
