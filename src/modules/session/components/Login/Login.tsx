'use client';

import { Loader2, Swords, Compass } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LobbyBackground } from '@/modules/lobby';
import { useLogin } from './Login.hook';
import { styles } from './Login.styles';
import type { LoginViewProps } from './Login.types';

/** Pure view: everything comes from props, so tests need no providers. */
export function LoginView({
  name,
  isLoading,
  isHydrated,
  showErrorDialog,
  onNameChange,
  onNameKeyDown,
  onSubmit,
  onErrorDialogOpenChange,
}: LoginViewProps) {
  return (
    <>
      <div className={styles.root}>
        <LobbyBackground />

        <Card className={styles.card}>
          <CardHeader className={styles.header}>
            <div className={styles.iconWrap}>
              <Compass className={styles.icon} />
            </div>
            <CardTitle className={styles.title}>Welcome to Corner Conquest</CardTitle>
            <CardDescription className={styles.description}>
              Enter your commander name to enter the lobby and begin your archipelago conquest.
            </CardDescription>
          </CardHeader>
          <CardContent className={styles.content}>
            <div className={styles.fieldGroup}>
              <Label htmlFor="username" className={styles.label}>
                Commander Name
              </Label>
              <Input
                type="text"
                id="username"
                placeholder="Your Name"
                value={name}
                onChange={(e) => onNameChange(e.target.value)}
                onKeyDown={onNameKeyDown}
                data-hydrated={isHydrated ? 'true' : undefined}
                className={styles.input}
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button className={styles.submitButton} onClick={onSubmit} disabled={isLoading || !name.trim()}>
              {isLoading ? (
                <Loader2 className={styles.loadingIcon} />
              ) : (
                <Swords className={styles.submitIcon} />
              )}
              Enter Lobby
            </Button>
          </CardFooter>
        </Card>
      </div>

      <AlertDialog open={showErrorDialog} onOpenChange={onErrorDialogOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Username Taken</AlertDialogTitle>
            <AlertDialogDescription>
              This username is already in use. Please choose a different one.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => onErrorDialogOpenChange(false)}>OK</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

/** Connected component for the route: reads player session through its hook. */
export function Login() {
  return <LoginView {...useLogin()} />;
}
