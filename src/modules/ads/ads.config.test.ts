import { isAdPlaceholderVisible, isAdsEnabled } from './ads.config';

function setNodeEnv(value: string) {
  Object.defineProperty(process.env, 'NODE_ENV', { value, configurable: true });
}

describe('isAdsEnabled', () => {
  afterEach(() => {
    delete process.env.NEXT_PUBLIC_ADS_ENABLED;
  });

  it('is off when the variable is unset', () => {
    expect(isAdsEnabled()).toBe(false);
  });

  it.each(['false', '1', 'TRUE', ''])('is off for %p', (value) => {
    process.env.NEXT_PUBLIC_ADS_ENABLED = value;

    expect(isAdsEnabled()).toBe(false);
  });

  it('is on only for the exact string true', () => {
    process.env.NEXT_PUBLIC_ADS_ENABLED = 'true';

    expect(isAdsEnabled()).toBe(true);
  });
});

describe('isAdPlaceholderVisible', () => {
  const originalNodeEnv = process.env.NODE_ENV;

  afterEach(() => setNodeEnv(originalNodeEnv ?? 'test'));

  it.each([
    ['development', true],
    ['test', true],
    ['production', false],
  ])('in %s is %p', (nodeEnv, expected) => {
    setNodeEnv(nodeEnv);

    expect(isAdPlaceholderVisible()).toBe(expected);
  });
});
