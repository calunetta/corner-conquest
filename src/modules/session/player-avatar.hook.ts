import { useState, useCallback } from 'react';
import { isValidAvatarId, type AvatarId } from '@/modules/avatars';
import { findAccountAvatarId, setAccountAvatarId, type AuthAccount } from './services/account.service';

/**
 * The player's chosen avatar. A signed-in account persists it to accounts/{uid}.avatarId; a guest
 * keeps it in memory only, so nothing is ever written to Firestore for a guest.
 */
export function usePlayerAvatar(account: AuthAccount | null) {
  const [avatarId, setAvatarIdState] = useState<AvatarId | null>(null);

  /** Signed-in: load the stored avatar (an invalid stored value becomes null). Guest: clear it, so a
   *  prior Google account's avatar can't leak into a fresh guest session. */
  const syncAvatarWithAccount = useCallback(async (nextAccount: AuthAccount) => {
    if (nextAccount.isAnonymous) {
      setAvatarIdState(null);
      return;
    }
    try {
      const storedAvatarId = await findAccountAvatarId(nextAccount.uid);
      setAvatarIdState(isValidAvatarId(storedAvatarId) ? storedAvatarId : null);
    } catch (error) {
      console.error('Error loading account avatar:', error);
    }
  }, []);

  const setAvatarId = useCallback(
    async (nextAvatarId: AvatarId): Promise<boolean> => {
      if (!account || account.isAnonymous) {
        setAvatarIdState(nextAvatarId);
        return true;
      }

      const previousAvatarId = avatarId;
      setAvatarIdState(nextAvatarId);
      try {
        await setAccountAvatarId(account.uid, nextAvatarId);
        return true;
      } catch (error) {
        console.error('Error saving avatar:', error);
        setAvatarIdState(previousAvatarId);
        return false;
      }
    },
    [account, avatarId],
  );

  return { avatarId, setAvatarId, syncAvatarWithAccount };
}
