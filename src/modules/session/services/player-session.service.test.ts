jest.mock('@/lib/firebase', () => ({
  db: {},
  doc: jest.fn(() => ({})),
  getDoc: jest.fn(),
  setDoc: jest.fn(),
  deleteDoc: jest.fn(),
}));

import { getDoc, setDoc, deleteDoc, doc, db } from '@/lib/firebase';
// Imported after the mock so the service picks up the mocked `@/lib/firebase` module.
import { findUsernameOwner, reserveUsername, releaseUsername } from './player-session.service';

const mockGetDoc = getDoc as jest.Mock;
const mockSetDoc = setDoc as jest.Mock;
const mockDeleteDoc = deleteDoc as jest.Mock;
const mockDoc = doc as jest.Mock;

describe('player-session.service', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findUsernameOwner', () => {
    it('returns the playerId when the username exists', async () => {
      mockGetDoc.mockResolvedValue({
        exists: jest.fn(() => true),
        data: jest.fn(() => ({ playerId: 'player_123' })),
      });

      const result = await findUsernameOwner('testuser');

      expect(result).toBe('player_123');
      expect(mockDoc).toHaveBeenCalledWith(db, 'usernames', 'testuser');
      expect(mockGetDoc).toHaveBeenCalled();
    });

    it('returns null when the username does not exist', async () => {
      mockGetDoc.mockResolvedValue({
        exists: jest.fn(() => false),
        data: jest.fn(() => undefined),
      });

      const result = await findUsernameOwner('nonexistent');

      expect(result).toBeNull();
      expect(mockDoc).toHaveBeenCalledWith(db, 'usernames', 'nonexistent');
    });

    it('queries the usernames collection with the provided username as the document id', async () => {
      mockGetDoc.mockResolvedValue({
        exists: jest.fn(() => false),
      });

      await findUsernameOwner('myusername');

      expect(mockDoc).toHaveBeenCalledWith(db, 'usernames', 'myusername');
    });
  });

  describe('reserveUsername', () => {
    it('calls setDoc with the username and playerId', async () => {
      mockSetDoc.mockResolvedValue(undefined);

      await reserveUsername('myusername', 'player_456');

      expect(mockDoc).toHaveBeenCalledWith(db, 'usernames', 'myusername');
      expect(mockSetDoc).toHaveBeenCalledWith({}, { playerId: 'player_456' });
    });

    it('writes to the usernames collection', async () => {
      mockSetDoc.mockResolvedValue(undefined);

      await reserveUsername('testname', 'player_789');

      expect(mockDoc).toHaveBeenCalledWith(db, 'usernames', 'testname');
      expect(mockSetDoc).toHaveBeenCalled();
    });

    it('resolves without throwing when setDoc succeeds', async () => {
      mockSetDoc.mockResolvedValue(undefined);

      await expect(reserveUsername('user', 'player_id')).resolves.not.toThrow();
    });

    it('propagates errors from setDoc', async () => {
      const error = new Error('Network error');
      mockSetDoc.mockRejectedValue(error);

      await expect(reserveUsername('user', 'player_id')).rejects.toThrow('Network error');
    });
  });

  describe('releaseUsername', () => {
    it('calls deleteDoc with the username', async () => {
      mockDeleteDoc.mockResolvedValue(undefined);

      await releaseUsername('myusername');

      expect(mockDoc).toHaveBeenCalledWith(db, 'usernames', 'myusername');
      expect(mockDeleteDoc).toHaveBeenCalledWith({});
    });

    it('deletes from the usernames collection', async () => {
      mockDeleteDoc.mockResolvedValue(undefined);

      await releaseUsername('testname');

      expect(mockDoc).toHaveBeenCalledWith(db, 'usernames', 'testname');
      expect(mockDeleteDoc).toHaveBeenCalled();
    });

    it('resolves without throwing when deleteDoc succeeds', async () => {
      mockDeleteDoc.mockResolvedValue(undefined);

      await expect(releaseUsername('user')).resolves.not.toThrow();
    });

    it('propagates errors from deleteDoc', async () => {
      const error = new Error('Permission denied');
      mockDeleteDoc.mockRejectedValue(error);

      await expect(releaseUsername('user')).rejects.toThrow('Permission denied');
    });
  });
});
