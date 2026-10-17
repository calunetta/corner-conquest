import { renderHook } from '@testing-library/react';
import { useConsentSignal } from '@/modules/consent';
import type { ConsentSignal } from '@/modules/consent';
import { useAdSlot } from './AdSlot.hook';

jest.mock('@/modules/consent', () => ({ useConsentSignal: jest.fn() }));

const unknown: ConsentSignal = { status: 'unknown', gdprApplies: undefined, tcString: null };
const gdprApplies: ConsentSignal = { status: 'ready', gdprApplies: true, tcString: 'ABC' };
const gdprExempt: ConsentSignal = { status: 'ready', gdprApplies: false, tcString: 'XYZ' };

describe('useAdSlot', () => {
  const originalNodeEnv = process.env.NODE_ENV;

  function setNodeEnv(value: string) {
    Object.defineProperty(process.env, 'NODE_ENV', { value, configurable: true });
  }

  function decide(signal: ConsentSignal) {
    jest.mocked(useConsentSignal).mockReturnValue(signal);
    return renderHook(() => useAdSlot()).result.current;
  }

  afterEach(() => {
    delete process.env.NEXT_PUBLIC_ADS_ENABLED;
    setNodeEnv(originalNodeEnv ?? 'test');
  });

  it('never requests an ad with the flag off, even with passing consent', () => {
    expect(decide(gdprExempt)).toMatchObject({ canRequestAd: false, showDevPlaceholder: false });
  });

  describe('flag on', () => {
    beforeEach(() => {
      process.env.NEXT_PUBLIC_ADS_ENABLED = 'true';
    });

    it('fails closed while consent is unknown', () => {
      expect(decide(unknown).canRequestAd).toBe(false);
    });

    it('fails closed when GDPR applies', () => {
      expect(decide(gdprApplies).canRequestAd).toBe(false);
    });

    it('allows a request when GDPR does not apply', () => {
      expect(decide(gdprExempt).canRequestAd).toBe(true);
    });

    it('shows the dev placeholder outside production', () => {
      setNodeEnv('development');

      expect(decide(gdprExempt).showDevPlaceholder).toBe(true);
    });

    it('never shows the dev placeholder in production', () => {
      setNodeEnv('production');

      expect(decide(gdprExempt)).toMatchObject({ canRequestAd: true, showDevPlaceholder: false });
    });

    it.each([unknown, gdprApplies, gdprExempt])('always uses non-personalized mode', (signal) => {
      expect(decide(signal).requestMode).toBe('non-personalized');
    });
  });
});
