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

const GUEST_DESCRIPTION = 'Enter your commander name to enter the lobby and begin your archipelago conquest.';
const ACCOUNT_DESCRIPTION = 'Choose your permanent commander name — this cannot be changed later.';

/** Pure view: everything comes from props, so tests and previews need no providers. */
export function LoginView({
  mode,
  name,
  isLoading,
  isHydrated,
  errorDialog,
  onNameChange,
  onNameKeyDown,
  onSubmit,
  onGoogleSignIn,
  onErrorDialogOpenChange,
}: LoginViewProps) {
  const isLoadingMode = mode === 'loading';
  const isGuestMode = mode === 'guest';

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
            {!isLoadingMode && (
              <CardDescription className={styles.description}>
                {isGuestMode ? GUEST_DESCRIPTION : ACCOUNT_DESCRIPTION}
              </CardDescription>
            )}
          </CardHeader>
          <CardContent className={styles.content}>
            {isLoadingMode && (
              <div className={styles.loadingWrap} role="status" aria-label="Loading">
                <Loader2 className={styles.spinner} aria-hidden />
              </div>
            )}
            {isGuestMode && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  className={styles.googleButton}
                  onClick={onGoogleSignIn}
                  disabled={isLoading}
                >
                  Sign in with Google
                </Button>
                <div className={styles.divider} aria-hidden>
                  <span className={styles.dividerLine} />
                  <span className={styles.dividerText}>or</span>
                  <span className={styles.dividerLine} />
                </div>
              </>
            )}
            {!isLoadingMode && (
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
            )}
          </CardContent>
          {!isLoadingMode && (
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
          )}
        </Card>
      </div>

      <AlertDialog open={errorDialog.open} onOpenChange={onErrorDialogOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{errorDialog.title}</AlertDialogTitle>
            <AlertDialogDescription>{errorDialog.description}</AlertDialogDescription>
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
