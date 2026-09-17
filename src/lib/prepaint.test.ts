import { describe, expect, it } from 'vitest';
import { PHASES, PHASE_SCHEDULE, getPhase } from './phase';
import { buildPrePaintScript } from './prepaint';

/**
 * The pre-paint script is a second, hand-written implementation of getPhase that runs as a
 * classic script before React exists. Two implementations of one rule is exactly the thing that
 * drifts silently — the failure is a single frame of the wrong sky, which no one reports — so
 * these tests execute the real emitted string rather than trusting it by inspection.
 *
 * The `new Function` below is the point of the exercise and is not a code-injection risk: its
 * body is this repo's own generated script, built from the checked-in PHASE_SCHEDULE constant,
 * and nothing user-supplied reaches it. It runs only under vitest, never in the shipped bundle.
 * The `search` argument is passed as a VALUE to the sandboxed window stub, not interpolated into
 * the source, so a hostile query string could not escape it either.
 */
function runScript(hour: number, minute = 0, search = ''): string {
  const script = buildPrePaintScript(PHASE_SCHEDULE);
  const attributes: Record<string, string> = {};
  const fakeWindow = { location: { search } };
  const fakeDocument = {
    documentElement: {
      setAttribute: (name: string, value: string) => {
        attributes[name] = value;
      },
    },
  };
  class FixedDate extends Date {
    constructor() {
      super(2026, 0, 15, hour, minute);
    }
  }
  new Function('window', 'document', 'Date', 'URLSearchParams', script)(
    fakeWindow,
    fakeDocument,
    FixedDate,
    URLSearchParams,
  );
  return attributes['data-phase']!;
}

describe('buildPrePaintScript', () => {
  it('agrees with getPhase at every half hour of the day', () => {
    for (let half = 0; half < 48; half += 1) {
      const hour = Math.floor(half / 2);
      const minute = (half % 2) * 30;
      const expected = getPhase(new Date(2026, 0, 15, hour, minute));
      expect(runScript(hour, minute), `${hour}:${String(minute).padStart(2, '0')}`).toBe(expected);
    }
  });

  it('honours the same ?phase override the app does', () => {
    for (const phase of PHASES) {
      expect(runScript(12, 0, `?phase=${phase}`)).toBe(phase);
    }
  });

  it('accepts the numeric override too', () => {
    expect(runScript(12, 0, '?phase=0')).toBe('night');
    expect(runScript(12, 0, '?phase=3')).toBe('evening');
  });

  it('falls back to the clock when the override is nonsense', () => {
    expect(runScript(12, 0, '?phase=dusk')).toBe(getPhase(new Date(2026, 0, 15, 12)));
    expect(runScript(12, 0, '?phase=9')).toBe(getPhase(new Date(2026, 0, 15, 12)));
  });

  it('sets the attribute on documentElement, which is what the CSS selects on', () => {
    expect(runScript(12)).toBeTruthy();
  });

  it('emits a self-contained IIFE wrapped in try/catch, so it can never block first paint', () => {
    const script = buildPrePaintScript(PHASE_SCHEDULE);
    expect(script.startsWith('(function(){try{')).toBe(true);
    expect(script.endsWith('}catch(e){}})();')).toBe(true);
  });
});
