'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { unlockDevTools } from './DevToolsLocked.service';
import { styles } from './DevToolsLocked.styles';

interface DevToolsLockedProps {
  /** False when the server has no DEV_TOOLS_PASSWORD, so there is nothing to type. */
  isConfigured: boolean;
}

/** Login page shown in place of a dev tool until this browser enters the dev tools password. */
export function DevToolsLocked({ isConfigured }: DevToolsLockedProps) {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    const message = await unlockDevTools(password);
    setIsSubmitting(false);

    if (message) {
      setError(message);
      return;
    }
    router.refresh();
  }

  return (
    <div className={styles.page} data-testid="dev-tools-locked">
      <h1 className={styles.title}>Dev tools login</h1>
      {!isConfigured && (
        <p role="alert" className={styles.error}>
          The dev tools are not set up on this server. Ask the owner to set DEV_TOOLS_PASSWORD.
        </p>
      )}
      {isConfigured && (
        <form className={styles.form} onSubmit={handleSubmit}>
          <label htmlFor="dev-tools-password" className={styles.label}>
            Password
          </label>
          <input
            id="dev-tools-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className={styles.input}
          />
          <button type="submit" className={styles.submit} disabled={isSubmitting || password === ''}>
            {isSubmitting ? 'Checking…' : 'Log in'}
          </button>
        </form>
      )}
      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
    </div>
  );
}
