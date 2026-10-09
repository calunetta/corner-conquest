import '@testing-library/jest-dom';
import React from 'react';

// firebase/auth's node build (used under jsdom, which has no "browser" condition) calls the
// platform fetch API at import time and throws "fetch is not defined". Every test that imports
// @/lib/firebase transitively hits this, so it's mocked globally rather than per test file.
jest.mock('firebase/auth', () => ({
  getAuth: jest.fn(() => ({ currentUser: null })),
  GoogleAuthProvider: jest.fn().mockImplementation(() => ({})),
  signInWithPopup: jest.fn(() => Promise.resolve({ user: { uid: 'mock-uid', displayName: 'Mock User' } })),
  signOut: jest.fn(() => Promise.resolve()),
  onAuthStateChanged: jest.fn((_auth, callback) => {
    callback(null);
    return () => {};
  }),
  connectAuthEmulator: jest.fn(),
}));

jest.mock('lucide-react', () => {
  return new Proxy(
    {},
    {
      get: (_target, prop) => {
        return function MockLucideIcon(props) {
          return <span data-testid={`lucide-icon-${String(prop).toLowerCase()}`} {...props} />;
        };
      },
    }
  );
});

// jsdom has no matchMedia. Hooks such as useIsMobile call it on mount, so every test needs a stub.
// matches: false keeps tests on the desktop branch (jsdom's default innerWidth is 1024).
window.matchMedia =
  window.matchMedia ||
  ((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }));
