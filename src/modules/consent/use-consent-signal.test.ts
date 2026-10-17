import { act, renderHook } from '@testing-library/react';
import { useConsentSignal } from './use-consent-signal';

type TcfCallback = (data: unknown, ok: boolean) => void;

// The store is a module singleton and registers with __tcfapi once, so the CMP stub is installed
// once and the tests run in order: unknown, then ready, then a post-unmount update.
describe('useConsentSignal', () => {
  let emit: TcfCallback = () => undefined;

  beforeAll(() => {
    window.__tcfapi = ((_command: string, _version: number, callback: TcfCallback) => {
      emit = callback;
    }) as unknown as Window['__tcfapi'];
  });

  afterAll(() => {
    delete window.__tcfapi;
  });

  it('starts as unknown', () => {
    const { result } = renderHook(() => useConsentSignal());

    expect(result.current).toEqual({ status: 'unknown', gdprApplies: undefined, tcString: null });
  });

  it('updates when the CMP reports', () => {
    const { result } = renderHook(() => useConsentSignal());

    act(() => {
      emit({ tcString: 'ABC', gdprApplies: true }, true);
    });

    expect(result.current).toEqual({ status: 'ready', gdprApplies: true, tcString: 'ABC' });
  });

  it('stops updating after unmount', () => {
    const { result, unmount } = renderHook(() => useConsentSignal());
    unmount();

    act(() => {
      emit({ tcString: 'XYZ', gdprApplies: false }, true);
    });

    expect(result.current.tcString).toBe('ABC');
  });
});
