import {
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import * as fs from 'fs';

interface UsernameDoc {
  playerId: string;
  authUid?: string | null;
}

interface AccountDoc {
  username: string;
}

interface GameStateDoc {
  players: Array<{ playerId: string; id?: number; username?: string }>;
  currentPlayerIndex?: number;
  status?: string;
  islands?: unknown[];
  deathAnimations?: unknown[];
}

let testEnv: RulesTestEnvironment;

/** Writes a document bypassing the rules, to set up states the client can no longer produce. */
async function seedWithRulesDisabled(path: string, data: Record<string, unknown>): Promise<void> {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await context.firestore().doc(path).set(data);
  });
}

beforeAll(async () => {
  // Load the firestore.rules file and pass it to the test environment
  const rules = fs.readFileSync('firestore.rules', 'utf8');

  testEnv = await initializeTestEnvironment({
    projectId: 'test-project',
    firestore: {
      host: '127.0.0.1',
      port: 8080,
      rules,
    },
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

afterEach(async () => {
  await testEnv.clearFirestore();
});

describe('Firestore Rules: usernames collection', () => {
  describe('Read', () => {
    it('should allow anyone to read username documents (check availability)', async () => {
      const db = testEnv.unauthenticatedContext().firestore();

      // Set up: create a username doc
      const admin = testEnv.authenticatedContext('admin', { isAdmin: true });
      await admin.firestore().doc('usernames/alice').set({ playerId: 'player_1', authUid: null });

      // Test: unauthenticated read should work
      await expect(db.doc('usernames/alice').get()).resolves.toBeDefined();
    });
  });

  describe('Create: guest reservation', () => {
    it('should allow creating a new guest username reservation (authUid null)', async () => {
      const db = testEnv.unauthenticatedContext().firestore();

      // Test: create a new username doc with playerId and an explicit null authUid
      await expect(
        db.doc('usernames/bob').set({ playerId: 'player_2', authUid: null })
      ).resolves.toBeUndefined();
    });

    it('should reject a guest reservation that omits the authUid field', async () => {
      const db = testEnv.unauthenticatedContext().firestore();

      // Test: every usernames doc carries an explicit authUid (see firestore.rules create rule)
      await expect(
        db.doc('usernames/bob').set({ playerId: 'player_2' })
      ).rejects.toThrow();
    });

    it('should reject creating with invalid data structure (missing playerId)', async () => {
      const db = testEnv.unauthenticatedContext().firestore();

      // Test: create without playerId, so authUid is the only valid field
      await expect(
        db.doc('usernames/charlie').set({ username: 'charlie', authUid: null })
      ).rejects.toThrow();
    });
  });

  describe('Create: permanent account binding', () => {
    it('should allow the signed-in account to bind a username when it owns none yet', async () => {
      const db = testEnv.authenticatedContext('uid_alice').firestore();

      await expect(
        db.doc('usernames/alice_perm').set({ playerId: 'uid_alice', authUid: 'uid_alice' })
      ).resolves.toBeUndefined();
    });

    it('should reject binding with an authUid that is not the signed-in uid', async () => {
      const db = testEnv.authenticatedContext('uid_alice').firestore();

      await expect(
        db.doc('usernames/impostor').set({ playerId: 'uid_bob', authUid: 'uid_bob' })
      ).rejects.toThrow();
    });

    it('should reject a permanent binding when unauthenticated, even with a matching authUid', async () => {
      const db = testEnv.unauthenticatedContext().firestore();

      await expect(
        db.doc('usernames/anon_perm').set({ playerId: 'uid_x', authUid: 'uid_x' })
      ).rejects.toThrow();
    });

    it('should reject a second binding when the account already owns a username ("pick once")', async () => {
      await seedWithRulesDisabled('accounts/uid_alice', { username: 'first_name' });
      const db = testEnv.authenticatedContext('uid_alice').firestore();

      await expect(
        db.doc('usernames/second_name').set({ playerId: 'uid_alice', authUid: 'uid_alice' })
      ).rejects.toThrow();
    });

    it('should reject a permanent binding whose playerId is not a string', async () => {
      const db = testEnv.authenticatedContext('uid_alice').firestore();

      await expect(
        db.doc('usernames/numeric_id').set({ playerId: 123, authUid: 'uid_alice' })
      ).rejects.toThrow();
    });
  });

  describe('Update', () => {
    it('should allow updating a guest username with the same playerId', async () => {
      const db = testEnv.unauthenticatedContext().firestore();
      const playerId = 'player_same_123';

      // Setup: create a guest username
      await db.doc('usernames/diana').set({ playerId, authUid: null });

      // Test: update with same playerId should succeed
      await expect(
        db.doc('usernames/diana').update({ playerId })
      ).resolves.toBeUndefined();
    });

    it('should reject updating a guest username with a different playerId (prevent name stealing)', async () => {
      const db = testEnv.unauthenticatedContext().firestore();

      // Setup: create a username owned by player_1
      await db.doc('usernames/eve').set({ playerId: 'player_1', authUid: null });

      // Test: update to assign to player_2 should fail
      await expect(
        db.doc('usernames/eve').update({ playerId: 'player_2' })
      ).rejects.toThrow();
    });

    it('should reject updating a non-existent username', async () => {
      const db = testEnv.unauthenticatedContext().firestore();

      // Test: updating a non-existent doc should fail
      await expect(
        db.doc('usernames/frank').update({ playerId: 'player_3' })
      ).rejects.toThrow();
    });

    it('should reject promoting a guest reservation to an account binding, even by its owner', async () => {
      const db = testEnv.authenticatedContext('player_5').firestore();

      await db.doc('usernames/promote_me').set({ playerId: 'player_5', authUid: null });

      await expect(
        db.doc('usernames/promote_me').update({ authUid: 'player_5' })
      ).rejects.toThrow();
    });

    it('should reject updating a permanent binding, even by its owner with the same playerId', async () => {
      await seedWithRulesDisabled('usernames/locked_name', {
        playerId: 'uid_alice',
        authUid: 'uid_alice',
      });
      const db = testEnv.authenticatedContext('uid_alice').firestore();

      await expect(
        db.doc('usernames/locked_name').update({ playerId: 'uid_alice' })
      ).rejects.toThrow();
    });

    // REPRODUCTION (unverified in this environment: no Java 21, so the emulator cannot run).
    // Legacy guest docs written before authUid existed have no authUid field. The update rule
    // reads request.resource.data.authUid directly, which errors on a missing key and denies.
    // Expected to fail until the rule reads it with request.resource.data.get('authUid', null).
    it('should allow updating a legacy guest username that has no authUid field', async () => {
      await seedWithRulesDisabled('usernames/legacy_guest', { playerId: 'player_legacy' });
      const db = testEnv.unauthenticatedContext().firestore();

      await expect(
        db.doc('usernames/legacy_guest').update({ playerId: 'player_legacy' })
      ).resolves.toBeUndefined();
    });
  });

  describe('Delete', () => {
    it('should allow deleting a guest username (logout)', async () => {
      const db = testEnv.unauthenticatedContext().firestore();

      // Setup: create a guest username
      await db.doc('usernames/grace').set({ playerId: 'player_4', authUid: null });

      // Test: delete should succeed
      await expect(
        db.doc('usernames/grace').delete()
      ).resolves.toBeUndefined();
    });

    it('should allow deleting a legacy guest username that has no authUid field', async () => {
      await seedWithRulesDisabled('usernames/legacy_delete', { playerId: 'player_legacy' });
      const db = testEnv.unauthenticatedContext().firestore();

      await expect(
        db.doc('usernames/legacy_delete').delete()
      ).resolves.toBeUndefined();
    });

    it('should reject deleting a permanent binding, even by its owner', async () => {
      await seedWithRulesDisabled('usernames/keep_forever', {
        playerId: 'uid_alice',
        authUid: 'uid_alice',
      });
      const testDb = testEnv.authenticatedContext('uid_alice').firestore();

      await expect(
        testDb.doc('usernames/keep_forever').delete()
      ).rejects.toThrow();

      const remaining = await testDb.doc('usernames/keep_forever').get();
      expect(remaining.data()).toEqual({ playerId: 'uid_alice', authUid: 'uid_alice' });
    });
  });

  describe('Atomic bind: bindUsernameToAccount batch', () => {
    it('should commit the username and accounts docs together for a new account', async () => {
      const db = testEnv.authenticatedContext('uid_alice').firestore();

      const batch = db.batch();
      batch.set(db.doc('usernames/alice_batch'), { playerId: 'uid_alice', authUid: 'uid_alice' });
      batch.set(db.doc('accounts/uid_alice'), { username: 'alice_batch' });

      await expect(batch.commit()).resolves.toBeUndefined();

      const accountSnap = await db.doc('accounts/uid_alice').get();
      expect(accountSnap.data()).toEqual({ username: 'alice_batch' });
    });

    it('should reject a second bind batch for an account that already owns a username', async () => {
      const db = testEnv.authenticatedContext('uid_alice').firestore();
      await seedWithRulesDisabled('accounts/uid_alice', { username: 'alice_batch' });

      const batch = db.batch();
      batch.set(db.doc('usernames/alice_second'), { playerId: 'uid_alice', authUid: 'uid_alice' });
      batch.set(db.doc('accounts/uid_alice'), { username: 'alice_second' });

      await expect(batch.commit()).rejects.toThrow();

      const secondSnap = await db.doc('usernames/alice_second').get();
      expect(secondSnap.exists).toBe(false);
    });

    it('should reject binding a name that a guest currently holds, leaving no accounts doc behind', async () => {
      await seedWithRulesDisabled('usernames/taken_by_guest', { playerId: 'guest_1', authUid: null });
      const db = testEnv.authenticatedContext('uid_alice').firestore();

      const batch = db.batch();
      batch.set(db.doc('usernames/taken_by_guest'), { playerId: 'uid_alice', authUid: 'uid_alice' });
      batch.set(db.doc('accounts/uid_alice'), { username: 'taken_by_guest' });

      await expect(batch.commit()).rejects.toThrow();

      const accountSnap = await db.doc('accounts/uid_alice').get();
      expect(accountSnap.exists).toBe(false);
      const guestSnap = await db.doc('usernames/taken_by_guest').get();
      expect((guestSnap.data() as UsernameDoc).playerId).toBe('guest_1');
    });
  });

  describe('Security: cross-player attacks blocked', () => {
    it('should prevent one player from stealing another player\'s username', async () => {
      const db = testEnv.unauthenticatedContext().firestore();

      // Setup: alice reserves username
      const aliceId = 'alice_000';
      await db.doc('usernames/reserved').set({ playerId: aliceId, authUid: null });

      // Test: bob tries to steal alice's username
      const bobId = 'bob_111';
      await expect(
        db.doc('usernames/reserved').update({ playerId: bobId })
      ).rejects.toThrow();

      // Verify username still belongs to alice
      const snap = await db.doc('usernames/reserved').get();
      expect(snap.data()?.playerId).toBe(aliceId);
    });

    it('should prevent overwriting a guest reservation with setDoc from another player', async () => {
      const db = testEnv.unauthenticatedContext().firestore();

      // Setup: alice reserves a username
      await db.doc('usernames/alice_name').set({ playerId: 'alice_001', authUid: null });

      // Test: bob's setDoc on the existing doc is evaluated as an update, so it is rejected
      await expect(
        db.doc('usernames/alice_name').set({ playerId: 'bob_002', authUid: null })
      ).rejects.toThrow();

      // Verify the document still has alice's playerId
      const snap = await db.doc('usernames/alice_name').get();
      expect(snap.data()?.playerId).toBe('alice_001');
    });
  });
});

describe('Firestore Rules: accounts collection', () => {
  describe('Read', () => {
    it('should allow anyone to read an accounts doc (reverse lookup on sign-in)', async () => {
      await seedWithRulesDisabled('accounts/uid_alice', { username: 'alice_perm' });
      const db = testEnv.unauthenticatedContext().firestore();

      const snap = await db.doc('accounts/uid_alice').get();
      expect((snap.data() as AccountDoc).username).toBe('alice_perm');
    });
  });

  describe('Create', () => {
    it('should allow the owning uid to create its own accounts doc', async () => {
      const db = testEnv.authenticatedContext('uid_alice').firestore();

      await expect(
        db.doc('accounts/uid_alice').set({ username: 'alice_perm' })
      ).resolves.toBeUndefined();
    });

    it('should reject creating another account\'s accounts doc', async () => {
      const db = testEnv.authenticatedContext('uid_bob').firestore();

      await expect(
        db.doc('accounts/uid_alice').set({ username: 'alice_perm' })
      ).rejects.toThrow();
    });

    it('should reject creating an accounts doc when unauthenticated', async () => {
      const db = testEnv.unauthenticatedContext().firestore();

      await expect(
        db.doc('accounts/uid_alice').set({ username: 'alice_perm' })
      ).rejects.toThrow();
    });

    it.each([
      ['no username field', {}],
      ['a non-string username', { username: 42 }],
      ['a null username', { username: null }],
    ])('should reject creating an accounts doc with %s', async (_label, data) => {
      const db = testEnv.authenticatedContext('uid_alice').firestore();

      await expect(
        db.doc('accounts/uid_alice').set(data)
      ).rejects.toThrow();
    });
  });

  describe('Update and delete', () => {
    it('should reject updating an accounts doc, even by its owner', async () => {
      await seedWithRulesDisabled('accounts/uid_alice', { username: 'alice_perm' });
      const db = testEnv.authenticatedContext('uid_alice').firestore();

      await expect(
        db.doc('accounts/uid_alice').update({ username: 'renamed' })
      ).rejects.toThrow();

      const snap = await db.doc('accounts/uid_alice').get();
      expect((snap.data() as AccountDoc).username).toBe('alice_perm');
    });

    it('should reject deleting an accounts doc, even by its owner', async () => {
      await seedWithRulesDisabled('accounts/uid_alice', { username: 'alice_perm' });
      const db = testEnv.authenticatedContext('uid_alice').firestore();

      await expect(
        db.doc('accounts/uid_alice').delete()
      ).rejects.toThrow();

      const snap = await db.doc('accounts/uid_alice').get();
      expect(snap.exists).toBe(true);
    });
  });
});

describe('Firestore Rules: games collection', () => {
  describe('Read', () => {
    it('should allow anyone to read game documents', async () => {
      const db = testEnv.unauthenticatedContext().firestore();

      // Setup: create a game doc
      const admin = testEnv.authenticatedContext('admin', { isAdmin: true });
      await admin.firestore().doc('games/game_1').set({
        players: [{ playerId: 'player_1', id: 0 }],
        currentPlayerIndex: 0,
        status: 'playing',
      });

      // Test: read should succeed
      await expect(db.doc('games/game_1').get()).resolves.toBeDefined();
    });
  });

  describe('Create', () => {
    it('should allow creating a new game', async () => {
      const db = testEnv.unauthenticatedContext().firestore();

      // Test: create a new game with players array
      const gameState = {
        players: [
          { playerId: 'player_1', id: 0, username: 'alice' },
          { playerId: 'player_2', id: 1, username: 'bob' },
        ],
        currentPlayerIndex: 0,
        status: 'playing',
        islands: [],
        deathAnimations: [],
      };

      await expect(
        db.doc('games/new_game_1').set(gameState)
      ).resolves.toBeUndefined();
    });

    it('should allow creating a game with minimal valid structure', async () => {
      const db = testEnv.unauthenticatedContext().firestore();

      // Test: create with minimum required fields
      await expect(
        db.doc('games/minimal_game').set({ players: [{ playerId: 'player_1' }] })
      ).resolves.toBeUndefined();
    });
  });

  describe('Update', () => {
    it('should allow updating existing game (host updates game logic)', async () => {
      const db = testEnv.unauthenticatedContext().firestore();

      // Setup: create a game
      const initialState = {
        players: [
          { playerId: 'player_1', id: 0 },
          { playerId: 'player_2', id: 1 },
        ],
        currentPlayerIndex: 0,
        status: 'playing',
      };
      await db.doc('games/game_2').set(initialState);

      // Test: update should succeed if players array is maintained
      const updatedState = {
        players: initialState.players,
        currentPlayerIndex: 1,
        status: 'playing',
      };
      await expect(
        db.doc('games/game_2').set(updatedState)
      ).resolves.toBeUndefined();
    });

    it('should allow updateDoc to modify death animations', async () => {
      const db = testEnv.unauthenticatedContext().firestore();

      // Setup: create a game with death animations
      const initialState = {
        players: [{ playerId: 'player_1', id: 0 }],
        deathAnimations: [{ id: 'anim_1', createdAt: Date.now() }],
      };
      await db.doc('games/game_3').set(initialState);

      // Test: updateDoc to remove animations should succeed
      await expect(
        db.doc('games/game_3').update({ deathAnimations: [] })
      ).resolves.toBeUndefined();
    });

    it('should reject update that removes players array (structural corruption)', async () => {
      const db = testEnv.unauthenticatedContext().firestore();

      // Setup: create a game
      await db.doc('games/game_4').set({
        players: [{ playerId: 'player_1', id: 0 }],
      });

      // Test: removing players array should fail
      await expect(
        db.doc('games/game_4').update({ players: null })
      ).rejects.toThrow();
    });

    it('should reject update that empties players array', async () => {
      const db = testEnv.unauthenticatedContext().firestore();

      // Setup: create a game with players
      await db.doc('games/game_5').set({
        players: [{ playerId: 'player_1', id: 0 }],
      });

      // Test: emptying players should fail
      await expect(
        db.doc('games/game_5').update({ players: [] })
      ).rejects.toThrow();
    });

    it('should reject write without players array for existing game', async () => {
      const db = testEnv.unauthenticatedContext().firestore();

      // Setup: create a game
      await db.doc('games/game_6').set({
        players: [{ playerId: 'player_1', id: 0 }],
      });

      // Test: setDoc without players array should fail
      await expect(
        db.doc('games/game_6').set({ status: 'ended' })
      ).rejects.toThrow();
    });
  });

  describe('Integration: app read/write patterns', () => {
    it('should allow full game lifecycle: create, read, update', async () => {
      const db = testEnv.unauthenticatedContext().firestore();

      // 1. Create game (someone starts a game)
      const gameId = 'integration_game_1';
      const initialPlayers = [
        { playerId: 'alice_123', id: 0, username: 'alice' },
        { playerId: 'bob_456', id: 1, username: 'bob' },
      ];

      await expect(
        db.doc(`games/${gameId}`).set({
          players: initialPlayers,
          currentPlayerIndex: 0,
          status: 'playing',
          islands: [],
        })
      ).resolves.toBeUndefined();

      // 2. Read game state (players view the game)
      const gameSnap = await db.doc(`games/${gameId}`).get();
      expect(gameSnap.data()).toBeDefined();
      expect((gameSnap.data() as GameStateDoc)?.players).toEqual(initialPlayers);

      // 3. Update game (host processes a turn)
      await expect(
        db.doc(`games/${gameId}`).set({
          players: initialPlayers,
          currentPlayerIndex: 1,
          status: 'playing',
          islands: [{ id: '1', owner: 'bob_456' }],
        })
      ).resolves.toBeUndefined();

      // 4. Read updated state
      const updatedSnap = await db.doc(`games/${gameId}`).get();
      expect(updatedSnap.data()?.currentPlayerIndex).toBe(1);
    });

    it('should allow username reservation flow: create, read, update, delete', async () => {
      const db = testEnv.unauthenticatedContext().firestore();
      const playerId = 'charlie_789';
      const username = 'charlie';

      // 1. Read to check if username is available
      const existingSnap = await db.doc(`usernames/${username}`).get();
      expect(existingSnap.data()).toBeUndefined();

      // 2. Create username reservation (the shape reserveUsername writes)
      await expect(
        db.doc(`usernames/${username}`).set({ playerId, authUid: null })
      ).resolves.toBeUndefined();

      // 3. Read to verify reservation
      const reservedSnap = await db.doc(`usernames/${username}`).get();
      expect((reservedSnap.data() as UsernameDoc)?.playerId).toBe(playerId);

      // 4. Update with same playerId (changing other fields would work if they existed)
      await expect(
        db.doc(`usernames/${username}`).update({ playerId })
      ).resolves.toBeUndefined();

      // 5. Delete on logout
      await expect(
        db.doc(`usernames/${username}`).delete()
      ).resolves.toBeUndefined();

      // 6. Verify deletion
      const deletedSnap = await db.doc(`usernames/${username}`).get();
      expect(deletedSnap.data()).toBeUndefined();
    });
  });
});
