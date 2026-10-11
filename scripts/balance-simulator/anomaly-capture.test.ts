import { silenceConsoleAndCaptureAnomalies } from './anomaly-capture';

describe('silenceConsoleAndCaptureAnomalies', () => {
  it('records nothing when console.log/warn/error are never called', () => {
    const { recordedAnomalies, restore } = silenceConsoleAndCaptureAnomalies();

    expect(recordedAnomalies).toEqual([]);
    restore();
  });

  it('records a console.warn call as an unhandledAction anomaly', () => {
    const { recordedAnomalies, restore } = silenceConsoleAndCaptureAnomalies();

    console.warn('Action Foo is not a shared game state action or is unhandled.');

    expect(recordedAnomalies).toEqual([
      { kind: 'unhandledAction', message: 'Action Foo is not a shared game state action or is unhandled.' },
    ]);
    restore();
  });

  it('records a console.error call as a reducerError anomaly, using an Error argument\'s .message', () => {
    const { recordedAnomalies, restore } = silenceConsoleAndCaptureAnomalies();

    console.error('Error handling action Deploy:', new Error('boom'));

    expect(recordedAnomalies).toEqual([{ kind: 'reducerError', message: 'Error handling action Deploy: boom' }]);
    restore();
  });

  it('joins multiple non-Error args with a single space, converting each with String()', () => {
    const { recordedAnomalies, restore } = silenceConsoleAndCaptureAnomalies();

    console.error('first', 2, { a: 1 });

    expect(recordedAnomalies).toEqual([{ kind: 'reducerError', message: 'first 2 [object Object]' }]);
    restore();
  });

  it('does not print anything to the real console while silenced (warn/error)', () => {
    const realLog = process.stdout.write.bind(process.stdout);
    const writes: string[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (process.stdout.write as any) = (chunk: string) => {
      writes.push(String(chunk));
      return true;
    };

    const { restore } = silenceConsoleAndCaptureAnomalies();
    console.warn('should not print either');
    console.error('nor this');
    restore();

    process.stdout.write = realLog;
    expect(writes.join('')).not.toContain('should not print');
  });

  it('restore() lets console.warn/console.error behave normally again (no longer recorded)', () => {
    const { recordedAnomalies, restore } = silenceConsoleAndCaptureAnomalies();
    restore();

    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    console.warn('after restore');
    expect(recordedAnomalies).toEqual([]);
    warnSpy.mockRestore();
  });

  it('clearing recordedAnomalies between turns (recordedAnomalies.length = 0) attributes only the latest calls', () => {
    const { recordedAnomalies, restore } = silenceConsoleAndCaptureAnomalies();

    console.warn('turn 1 anomaly');
    expect(recordedAnomalies).toHaveLength(1);

    recordedAnomalies.length = 0;
    console.warn('turn 2 anomaly');

    expect(recordedAnomalies).toEqual([{ kind: 'unhandledAction', message: 'turn 2 anomaly' }]);
    restore();
  });
});
