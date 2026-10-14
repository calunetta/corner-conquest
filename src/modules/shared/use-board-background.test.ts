/* eslint-disable @typescript-eslint/no-require-imports -- jest.isolateModules only loads a fresh copy through require() */
import type * as ReactModuleTypes from 'react';
import type * as ReactDomClientTypes from 'react-dom/client';
import { BOARD_BACKGROUND_STORAGE_KEY } from './board-background-store';
import type { UseBoardBackgroundResult } from './use-board-background';

type ReactModule = typeof ReactModuleTypes;
type ReactDomClientModule = typeof ReactDomClientTypes;

interface FreshModules {
  React: ReactModule;
  ReactDomClient: ReactDomClientModule;
  useBoardBackground: () => UseBoardBackgroundResult;
  getBoardBackgroundEnabled: () => boolean;
}

interface MountedHook {
  /** The hook's latest return value, refreshed on every render. */
  readonly result: UseBoardBackgroundResult;
  unmount: () => void;
}

// The store keeps its value and its hydration flag at module level. Each test loads a fresh copy of
// the store and the hook, with the React instance they share, so one test's writes or hydration cannot
// leak into the next. The probe below renders with react-dom directly, not renderHook: loading
// @testing-library/react inside a test body fails, because its dist/index.js calls afterEach/beforeAll/
// afterAll at import time (node_modules/@testing-library/react/dist/index.js:27,44,48), and jest-circus
// rejects hook registration inside a test ("Hooks cannot be defined inside tests").
function loadFreshModules(): FreshModules {
  let loaded: FreshModules | undefined;
  jest.isolateModules(() => {
    loaded = {
      React: require('react'),
      ReactDomClient: require('react-dom/client'),
      useBoardBackground: require('./use-board-background').useBoardBackground,
      getBoardBackgroundEnabled: require('./board-background-store').getBoardBackgroundEnabled,
    };
  });
  if (!loaded) throw new Error('use-board-background failed to load');
  return loaded;
}

function mountHook(modules: FreshModules): MountedHook {
  const { React, ReactDomClient, useBoardBackground } = modules;
  const container = document.createElement('div');
  const root = ReactDomClient.createRoot(container);
  let latest: UseBoardBackgroundResult | undefined;

  function Probe(): null {
    latest = useBoardBackground();
    return null;
  }

  React.act(() => {
    root.render(React.createElement(Probe));
  });

  return {
    get result() {
      if (!latest) throw new Error('hook has not rendered');
      return latest;
    },
    unmount: () => {
      React.act(() => {
        root.unmount();
      });
    },
  };
}

function act(modules: FreshModules, callback: () => void): void {
  modules.React.act(callback);
}

let modules: FreshModules;

beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  localStorage.clear();
  modules = loadFreshModules();
});

describe('useBoardBackground', () => {
  it('returns isBackgroundOn true and a setter when nothing is stored', () => {
    const hook = mountHook(modules);

    expect(hook.result.isBackgroundOn).toBe(true);
    expect(typeof hook.result.setBackgroundOn).toBe('function');
  });

  it('settles on a stored "false" after mount', () => {
    localStorage.setItem(BOARD_BACKGROUND_STORAGE_KEY, 'false');

    const hook = mountHook(modules);

    expect(hook.result.isBackgroundOn).toBe(false);
  });

  it('keeps true for a stored value that is not "false"', () => {
    localStorage.setItem(BOARD_BACKGROUND_STORAGE_KEY, 'banana');

    const hook = mountHook(modules);

    expect(hook.result.isBackgroundOn).toBe(true);
  });

  it('turns off and persists "false" when setBackgroundOn(false) is called', () => {
    const hook = mountHook(modules);

    act(modules, () => {
      hook.result.setBackgroundOn(false);
    });

    expect(hook.result.isBackgroundOn).toBe(false);
    expect(localStorage.getItem(BOARD_BACKGROUND_STORAGE_KEY)).toBe('false');
    expect(modules.getBoardBackgroundEnabled()).toBe(false);
  });

  it('turns back on and persists "true" when setBackgroundOn(true) follows an off', () => {
    const hook = mountHook(modules);
    act(modules, () => {
      hook.result.setBackgroundOn(false);
    });

    act(modules, () => {
      hook.result.setBackgroundOn(true);
    });

    expect(hook.result.isBackgroundOn).toBe(true);
    expect(localStorage.getItem(BOARD_BACKGROUND_STORAGE_KEY)).toBe('true');
  });

  it('updates every mounted instance when one instance sets the value', () => {
    const headerInstance = mountHook(modules);
    const boardInstance = mountHook(modules);

    act(modules, () => {
      headerInstance.result.setBackgroundOn(false);
    });

    expect(headerInstance.result.isBackgroundOn).toBe(false);
    expect(boardInstance.result.isBackgroundOn).toBe(false);
  });

  it('starts a newly mounted instance from the value already set in this session', () => {
    const firstInstance = mountHook(modules);
    act(modules, () => {
      firstInstance.result.setBackgroundOn(false);
    });

    const secondInstance = mountHook(modules);

    expect(secondInstance.result.isBackgroundOn).toBe(false);
  });

  it('keeps the session value when storage changes after the first mount', () => {
    localStorage.setItem(BOARD_BACKGROUND_STORAGE_KEY, 'false');
    mountHook(modules);

    localStorage.setItem(BOARD_BACKGROUND_STORAGE_KEY, 'true');
    const laterInstance = mountHook(modules);

    expect(laterInstance.result.isBackgroundOn).toBe(false);
  });

  it('stops updating an unmounted instance while the mounted one keeps working', () => {
    const unmountedInstance = mountHook(modules);
    const mountedInstance = mountHook(modules);
    unmountedInstance.unmount();

    act(modules, () => {
      mountedInstance.result.setBackgroundOn(false);
    });

    expect(mountedInstance.result.isBackgroundOn).toBe(false);
    expect(unmountedInstance.result.isBackgroundOn).toBe(true);
    expect(modules.getBoardBackgroundEnabled()).toBe(false);
  });
});
