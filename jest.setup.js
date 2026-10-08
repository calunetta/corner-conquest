import '@testing-library/jest-dom';
import React from 'react';

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
