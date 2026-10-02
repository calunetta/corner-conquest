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
