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
}));

describe('Firebase Firestore Emulator Configuration', () => {
  let originalEnv: string | undefined;

  beforeEach(() => {
    jest.clearAllMocks();
    originalEnv = process.env.NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST;
  });

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST;
    } else {
      process.env.NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST = originalEnv;
    }
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

  it.each([
    ['127.0.0.1:8080', '127.0.0.1', 8080],
    ['127.0.0.1:65535', '127.0.0.1', 65535], // highest valid port
  ])('parses "%s" into host %s and a numeric port %d', (envValue, host, port) => {
    process.env.NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST = envValue;

    jest.isolateModules(() => {
      require('@/lib/firebase');
    });

    expect(mockConnectFirestoreEmulator).toHaveBeenCalledWith(mockDb, host, port);
    expect(typeof mockConnectFirestoreEmulator.mock.calls[0][2]).toBe('number');
  });
});
