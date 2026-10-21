import { CardName } from '@/lib/types';
import { CARD_ART } from './card-art';
import { CARD_PRELOAD_TIMEOUT_MS, preloadCardArt } from './card-preload';

class FakeImage {
  static instances: FakeImage[] = [];
  static decode: (() => Promise<void>) | undefined;
  src = '';
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  decode: (() => Promise<void>) | undefined = FakeImage.decode;
  constructor() {
    FakeImage.instances.push(this);
  }
}

const originalImage = window.Image;

/** Flags settlement without awaiting, so a pending promise is observable. */
function track(promise: Promise<void>) {
  const state = { isSettled: false, isRejected: false };
  promise.then(
    () => {
      state.isSettled = true;
    },
    () => {
      state.isRejected = true;
    },
  );
  return state;
}

const flush = () => Promise.resolve().then(() => Promise.resolve());

describe('preloadCardArt', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    FakeImage.instances = [];
    FakeImage.decode = undefined;
    window.Image = FakeImage as unknown as typeof Image;
  });

  afterEach(() => {
    jest.useRealTimers();
    window.Image = originalImage;
  });

  it('uses a 1500 ms default timeout', () => {
    expect(CARD_PRELOAD_TIMEOUT_MS).toBe(1500);
  });

  it.each(Object.values(CardName))('loads the card image of %s', (cardName) => {
    void preloadCardArt(cardName);
    expect(FakeImage.instances).toHaveLength(1);
    expect(FakeImage.instances[0].src).toBe(CARD_ART[cardName].card);
  });

  it('stays pending until onload when decode does not exist', async () => {
    const state = track(preloadCardArt(CardName.WarChief));
    await flush();
    expect(state.isSettled).toBe(false);
    FakeImage.instances[0].onload?.();
    await flush();
    expect(state.isSettled).toBe(true);
  });

  it('resolves after decode() resolves when decode exists', async () => {
    let finishDecode!: () => void;
    FakeImage.decode = () =>
      new Promise<void>((done) => {
        finishDecode = done;
      });
    const state = track(preloadCardArt(CardName.WarChief));
    await flush();
    expect(state.isSettled).toBe(false);
    finishDecode();
    await flush();
    expect(state.isSettled).toBe(true);
  });

  it('resolves and does not reject when decode() rejects', async () => {
    FakeImage.decode = () => Promise.reject(new Error('broken file'));
    const state = track(preloadCardArt(CardName.WarChief));
    await flush();
    expect(state).toEqual({ isSettled: true, isRejected: false });
  });

  it('resolves on image error', async () => {
    const state = track(preloadCardArt(CardName.Scout));
    FakeImage.instances[0].onerror?.();
    await flush();
    expect(state).toEqual({ isSettled: true, isRejected: false });
  });

  it('resolves after 1500 ms when nothing fires, not before 1499 ms', async () => {
    const state = track(preloadCardArt(CardName.Scout));
    jest.advanceTimersByTime(CARD_PRELOAD_TIMEOUT_MS - 1);
    await flush();
    expect(state.isSettled).toBe(false);
    jest.advanceTimersByTime(1);
    await flush();
    expect(state.isSettled).toBe(true);
  });

  it('honors a custom timeout', async () => {
    const state = track(preloadCardArt(CardName.Scout, 200));
    jest.advanceTimersByTime(199);
    await flush();
    expect(state.isSettled).toBe(false);
    jest.advanceTimersByTime(1);
    await flush();
    expect(state.isSettled).toBe(true);
  });

  it('clears its timer once settled', async () => {
    void preloadCardArt(CardName.Scout);
    FakeImage.instances[0].onload?.();
    await flush();
    expect(jest.getTimerCount()).toBe(0);
  });
});
