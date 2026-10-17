'use client';

import * as React from 'react';
import { getConsentSignal, subscribeToConsentSignal } from './consent-signal-store';
import type { ConsentSignal } from './consent-signal-store';

/** Reads the CMP's TCF consent signal; 'unknown' until the CMP reports. */
export function useConsentSignal(): ConsentSignal {
  const [signal, setSignal] = React.useState<ConsentSignal>(getConsentSignal());

  React.useEffect(() => {
    // The signal may have changed between first render and subscribing.
    setSignal(getConsentSignal());
    return subscribeToConsentSignal(setSignal);
  }, []);

  return signal;
}
