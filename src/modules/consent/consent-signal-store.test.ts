const SAMPLE_TC_DATA = { tcString: 'ABC', gdprApplies: true, eventStatus: 'tcloaded' };

async function loadFreshStore() {
  jest.resetModules();
  return import('./consent-signal-store');
}

function installTcfApi(): jest.Mock {
  const tcfApi = jest.fn((_command: string, _version: number, callback: (data: unknown, ok: boolean) => void) => {
    callback(SAMPLE_TC_DATA, true);
  });
  window.__tcfapi = tcfApi as unknown as Window['__tcfapi'];
  return tcfApi;
}

describe('consent-signal-store', () => {
  afterEach(() => {
    delete window.__tcfapi;
  });

  it('reports unknown and does not throw when __tcfapi is absent', async () => {
    const { getConsentSignal, subscribeToConsentSignal } = await loadFreshStore();
    const listener = jest.fn();

    expect(() => subscribeToConsentSignal(listener)).not.toThrow();
    expect(getConsentSignal()).toEqual({ status: 'unknown', gdprApplies: undefined, tcString: null });
    expect(listener).not.toHaveBeenCalled();
  });

  it('mirrors the CMP callback and notifies subscribers', async () => {
    installTcfApi();
    const { getConsentSignal, subscribeToConsentSignal } = await loadFreshStore();
    const listener = jest.fn();

    subscribeToConsentSignal(listener);

    const expected = { status: 'ready', gdprApplies: true, tcString: 'ABC' };
    expect(getConsentSignal()).toEqual(expected);
    expect(listener).toHaveBeenCalledWith(expected);
  });

  it('registers the __tcfapi listener once across two subscriptions', async () => {
    const tcfApi = installTcfApi();
    const { subscribeToConsentSignal } = await loadFreshStore();

    subscribeToConsentSignal(jest.fn());
    subscribeToConsentSignal(jest.fn());

    expect(tcfApi).toHaveBeenCalledTimes(1);
    expect(tcfApi).toHaveBeenCalledWith('addEventListener', 2, expect.any(Function));
  });

  it('gives each subscriber an independent unsubscribe', async () => {
    let emit: (data: unknown, ok: boolean) => void = () => undefined;
    window.__tcfapi = ((_command: string, _version: number, callback: typeof emit) => {
      emit = callback;
    }) as unknown as Window['__tcfapi'];
    const { subscribeToConsentSignal } = await loadFreshStore();
    const first = jest.fn();
    const second = jest.fn();

    const unsubscribeFirst = subscribeToConsentSignal(first);
    subscribeToConsentSignal(second);
    unsubscribeFirst();
    emit(SAMPLE_TC_DATA, true);

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });
});
