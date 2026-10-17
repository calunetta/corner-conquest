/** Mirrors the IAB TCF v2.2 __tcfapi signal; never independently persisted. */
export interface ConsentSignal {
  /** 'unknown' until the first __tcfapi callback fires (no CMP present, or not yet initialized). */
  status: 'unknown' | 'ready';
  /** TCData.gdprApplies: true, false, or undefined (unknown), passed through verbatim. */
  gdprApplies: boolean | undefined;
  /** TCData.tcString, or null before one exists. */
  tcString: string | null;
}

interface TcData {
  tcString?: string;
  gdprApplies?: boolean;
}

type TcfApi = (
  command: 'addEventListener',
  version: 2,
  callback: (tcData: TcData, success: boolean) => void,
) => void;

declare global {
  interface Window {
    __tcfapi?: TcfApi;
  }
}

type ConsentSignalListener = (signal: ConsentSignal) => void;

const UNKNOWN_SIGNAL: ConsentSignal = { status: 'unknown', gdprApplies: undefined, tcString: null };
const TCF_VERSION = 2;

const listeners: ConsentSignalListener[] = [];

let currentSignal: ConsentSignal = UNKNOWN_SIGNAL;
let isTcfListenerRegistered = false;

function notifyListeners(): void {
  listeners.forEach((listener) => {
    listener(currentSignal);
  });
}

function handleTcData(tcData: TcData, success: boolean): void {
  if (!success) return;
  currentSignal = {
    status: 'ready',
    gdprApplies: tcData.gdprApplies,
    tcString: tcData.tcString ?? null,
  };
  notifyListeners();
}

/**
 * Registers the CMP listener once. The flag is only set when __tcfapi exists, so a CMP script that
 * loads after the first subscriber is still picked up by a later call.
 */
function ensureTcfListenerRegistered(): void {
  if (isTcfListenerRegistered || typeof window === 'undefined') return;
  if (typeof window.__tcfapi !== 'function') return;

  isTcfListenerRegistered = true;
  try {
    window.__tcfapi('addEventListener', TCF_VERSION, handleTcData);
  } catch {
    // A misbehaving CMP must not break the app; the signal simply stays 'unknown'.
    isTcfListenerRegistered = false;
  }
}

/** Current in-memory mirror; does not itself register the __tcfapi listener. */
export function getConsentSignal(): ConsentSignal {
  return currentSignal;
}

/**
 * Registers the window.__tcfapi('addEventListener', 2, ...) listener on first call (idempotent),
 * subscribes `listener` to every update, and returns an unsubscribe function. The signal stays
 * `status: 'unknown'` when window.__tcfapi is not a function (SSR, or CMP script not loaded).
 */
export function subscribeToConsentSignal(listener: ConsentSignalListener): () => void {
  listeners.push(listener);
  ensureTcfListenerRegistered();
  return () => {
    const index = listeners.indexOf(listener);
    if (index > -1) {
      listeners.splice(index, 1);
    }
  };
}
