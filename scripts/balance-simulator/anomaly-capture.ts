import type { Anomaly } from './engine';

export interface AnomalyCapture {
  /** Every warn/error call recorded since the array was last cleared (`recordedAnomalies.length = 0`). */
  recordedAnomalies: Anomaly[];
  /** Restores console.log/warn/error to their real implementations. */
  restore: () => void;
}

/** `console.error('Error handling action X:', error)`'s second arg is the real signal; an Error
 *  contributes only its `.message`, everything else (including a bare string) is used as-is. */
function formatConsoleArgs(args: unknown[]): string {
  return args.map((arg) => (arg instanceof Error ? arg.message : String(arg))).join(' ');
}

/**
 * Silences console.log/warn/error for the duration of a simulated match — the dispatcher logs a
 * caught error instead of throwing (game-rules.reducer.ts:137, with the unhandled-action default
 * case at line 133), which happens on real, confirmed bot-logic bugs and would otherwise spam a
 * run's output without being a simulator problem — while also recording every warn/error call
 * into `recordedAnomalies`, those same two anomaly signals. Callers clear
 * `recordedAnomalies` between bot turns to attribute each anomaly to the turn that caused it.
 */
export function silenceConsoleAndCaptureAnomalies(): AnomalyCapture {
  const recordedAnomalies: Anomaly[] = [];
  const silencedMethods = (['log', 'warn', 'error'] as const).map((method) => {
    if (method === 'log') return jest.spyOn(console, method).mockImplementation(() => {});
    const kind: Anomaly['kind'] = method === 'warn' ? 'unhandledAction' : 'reducerError';
    return jest.spyOn(console, method).mockImplementation((...args: unknown[]) => {
      recordedAnomalies.push({ kind, message: formatConsoleArgs(args) });
    });
  });

  return {
    recordedAnomalies,
    restore: () => silencedMethods.forEach((spy) => spy.mockRestore()),
  };
}
