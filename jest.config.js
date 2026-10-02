const nextJest = require('next/jest');

const createJestConfig = nextJest({
  dir: './',
});

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    // jsdom resolves lucide-react's "browser" export, which is ESM; load its CommonJS build instead.
    '^lucide-react$': require.resolve('lucide-react'),
  },
  // firestore.rules.test.ts needs jest.rules.config.js (node env, a running emulator):
  // run it with `npm run test:rules`, not through this jsdom config.
  testPathIgnorePatterns: ['<rootDir>/node_modules/', '<rootDir>/e2e/', '<rootDir>/firestore.rules.test.ts'],
};

module.exports = createJestConfig(customJestConfig);
