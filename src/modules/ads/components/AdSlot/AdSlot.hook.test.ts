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

  it('never shows the placeholder or requests an ad with the flag off', () => {
    expect(decide(gdprExempt)).toMatchObject({ canRequestAd: false, showDevPlaceholder: false });
  });

  describe('flag on', () => {
    beforeEach(() => {
      process.env.NEXT_PUBLIC_ADS_ENABLED = 'true';
    });

    it('shows the placeholder while consent is unknown', () => {
      expect(decide(unknown)).toMatchObject({ showDevPlaceholder: true, consentLabel: 'unknown' });
    });

    it('shows the placeholder when GDPR applies, labelled with that state', () => {
      expect(decide(gdprApplies)).toMatchObject({ showDevPlaceholder: true, consentLabel: 'gdpr applies' });
    });

    it('shows the placeholder when GDPR does not apply', () => {
      expect(decide(gdprExempt)).toMatchObject({
        showDevPlaceholder: true,
        consentLabel: 'gdpr does not apply',
      });
    });

    it('fails closed for ad requests while consent is unknown', () => {
      expect(decide(unknown).canRequestAd).toBe(false);
    });

    it('fails closed for ad requests when GDPR applies', () => {
      expect(decide(gdprApplies).canRequestAd).toBe(false);
    });

    it('allows an ad request when GDPR does not apply', () => {
      expect(decide(gdprExempt).canRequestAd).toBe(true);
    });

    it('never shows the placeholder in production', () => {
      setNodeEnv('production');

      expect(decide(gdprExempt)).toMatchObject({ canRequestAd: true, showDevPlaceholder: false });
    });

    it.each([unknown, gdprApplies, gdprExempt])('always uses non-personalized mode', (signal) => {
      expect(decide(signal).requestMode).toBe('non-personalized');
    });
  });
});
