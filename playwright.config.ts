import { defineConfig, devices } from '@playwright/test';

/** Must match `emulators.firestore` in firebase.json. */
const FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
/** The `demo-` prefix keeps the emulator from ever touching a real Firebase project. */
const EMULATOR_PROJECT_ID = 'demo-corner-conquest';
const APP_URL = 'http://localhost:3000';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 30000,
  use: {
    baseURL: APP_URL,
    trace: 'on-first-retry',
    viewport: { width: 1280, height: 720 },
    // Cloud sessions set CHROMIUM_PATH (SessionStart hook) when their preinstalled Chromium
    // differs from the build this Playwright version expects.
    launchOptions: { executablePath: process.env.CHROMIUM_PATH || undefined },
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: [
    {
      command: `npx firebase emulators:start --only firestore --project ${EMULATOR_PROJECT_ID}`,
      url: `http://${FIRESTORE_EMULATOR_HOST}`,
      reuseExistingServer: true, // a server already on 8080 is local, so the real project stays out of reach
      timeout: 120000, // the first run downloads the emulator jar
      gracefulShutdown: { signal: 'SIGTERM', timeout: 10000 },
    },
    {
      // NEXT_PUBLIC_* values are inlined at build time, so the build must see the emulator env.
      command: 'npm run build && npm run start',
      url: APP_URL,
      reuseExistingServer: false, // never reuse a server that may talk to the real project
      timeout: 300000,
      env: {
        NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST: FIRESTORE_EMULATOR_HOST,
        NEXT_PUBLIC_FIREBASE_PROJECT_ID: EMULATOR_PROJECT_ID,
      },
    },
  ],
});
