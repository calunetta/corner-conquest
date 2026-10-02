import type { Firestore } from 'firebase/firestore';

const mockDb = { id: 'db' } as unknown as Firestore;

jest.mock('firebase/app', () => ({
  initializeApp: jest.fn(() => ({})),
  getApps: jest.fn(() => []),
  getApp: jest.fn(),
}));

const mockConnectFirestoreEmulator = jest.fn();

jest.mock('firebase/firestore', () => ({
  getFirestore: jest.fn(() => mockDb),
  connectFirestoreEmulator: mockConnectFirestoreEmulator,
  // Re-export all other symbols as undefined to prevent import errors
  doc: undefined,
  getDoc: undefined,
  setDoc: undefined,
  deleteDoc: undefined,
  collection: undefined,
  query: undefined,
  where: undefined,
  onSnapshot: undefined,
  writeBatch: undefined,
  runTransaction: undefined,
  updateDoc: undefined,
  arrayUnion: undefined,
}));

describe('Firebase Firestore Emulator Configuration', () => {
  let originalEnv: string | undefined;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    originalEnv = process.env.NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST;
  });

  afterEach(() => {
    process.env.NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST = originalEnv;
  });

  it('connects to the emulator when NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST is set to 127.0.0.1:8080', () => {
    process.env.NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';

    jest.isolateModules(() => {
      require('@/lib/firebase');
    });

    expect(mockConnectFirestoreEmulator).toHaveBeenCalledTimes(1);
    expect(mockConnectFirestoreEmulator).toHaveBeenCalledWith(mockDb, '127.0.0.1', 8080);
  });

  it('does not connect to the emulator when NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST is not set', () => {
    delete process.env.NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST;

    jest.isolateModules(() => {
      require('@/lib/firebase');
    });

    expect(mockConnectFirestoreEmulator).not.toHaveBeenCalled();
  });

  it('connects to the emulator with custom host and port when NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST is set to localhost:9099', () => {
    process.env.NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST = 'localhost:9099';

    jest.isolateModules(() => {
      require('@/lib/firebase');
    });

    expect(mockConnectFirestoreEmulator).toHaveBeenCalledTimes(1);
    expect(mockConnectFirestoreEmulator).toHaveBeenCalledWith(mockDb, 'localhost', 9099);
  });

  it('parses the port as a number, not a string', () => {
    process.env.NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';

    jest.isolateModules(() => {
      require('@/lib/firebase');
    });

    const call = mockConnectFirestoreEmulator.mock.calls[0];
    expect(typeof call[2]).toBe('number');
    expect(call[2]).toBe(8080);
  });

  it('handles edge case with high port number', () => {
    process.env.NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST = '127.0.0.1:65535';

    jest.isolateModules(() => {
      require('@/lib/firebase');
    });

    expect(mockConnectFirestoreEmulator).toHaveBeenCalledWith(mockDb, '127.0.0.1', 65535);
  });
});
