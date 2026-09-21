import { describe, expect, it } from 'vitest';
import { IDLE_WHEEL, QUIET_MS, readWheel, wheelPixels, type Step } from './wheelGesture';

const FRAME = 16.7;

/**
 * A two-finger flick as macOS delivers it: a few frames of fingers ramping up to `peak`, then
 * momentum decaying by `decay` a frame until it is under half a pixel — about 1.2s at the
 * defaults, and 2.4s for a hard one.
 */
function flick(direction: 1 | -1, peak = 40, decay = 0.94): number[] {
  const fingers = [0.05, 0.12, 0.25, 0.45, 0.7, 0.9, 1, 0.95].map((share) => share * peak);
  const momentum: number[] = [];
  for (let size = peak * 0.95 * decay; size >= 0.5; size *= decay) momentum.push(size);
  return [...fingers, ...momentum].map((size) => size * direction);
}

/** Sums neighbouring events the way Chrome does inside a busy frame: every `every`th pair. */
function coalesce(deltas: number[], every: number): { delta: number; at: number }[] {
  const out: { delta: number; at: number }[] = [];
  for (let i = 0; i < deltas.length; i += 1) {
    if (i % every === 0 && i + 1 < deltas.length) {
      out.push({ delta: deltas[i] + deltas[i + 1], at: (i + 1) * FRAME });
      i += 1;
    } else {
      out.push({ delta: deltas[i], at: i * FRAME });
    }
  }
  return out;
}

/**
 * Plays streams of deltas, each starting at its own time, and returns every step taken. A stream
 * cuts off the one before it at its start — fingers landing on the pad stop the momentum, which
 * is what makes a swipe during momentum possible at all.
 */
function play(...streams: { at: number; deltas: number[] }[]): Step[] {
  const steps: Step[] = [];
  let state = IDLE_WHEEL;
  streams.forEach((stream, n) => {
    const until = streams[n + 1]?.at ?? Number.POSITIVE_INFINITY;
    stream.deltas.forEach((delta, i) => {
      const time = stream.at + i * FRAME;
      if (time >= until) return;
      const read = readWheel(state, delta, time);
      state = read.state;
      if (read.step) steps.push(read.step);
    });
  });
  return steps;
}

describe('readWheel — trackpad', () => {
  it('steps once for a flick, momentum and all', () => {
    expect(play({ at: 0, deltas: flick(1) })).toEqual([1]);
  });

  it('steps once for a hard flick whose momentum runs over two seconds', () => {
    expect(play({ at: 0, deltas: flick(1, 90, 0.965) })).toEqual([1]);
  });

  it('goes back when the reader flicks back up while the momentum is still running', () => {
    expect(play({ at: 0, deltas: flick(1) }, { at: 600, deltas: flick(-1) })).toEqual([1, -1]);
  });

  it('goes back even straight away, before the momentum has slowed at all', () => {
    expect(play({ at: 0, deltas: flick(1) }, { at: 200, deltas: flick(-1) })).toEqual([1, -1]);
  });

  it('goes on when the reader flicks again the same way during the momentum', () => {
    expect(play({ at: 0, deltas: flick(1) }, { at: 700, deltas: flick(1) })).toEqual([1, 1]);
  });

  it('goes on for a second flick that lands while the first is still fast', () => {
    expect(play({ at: 0, deltas: flick(1) }, { at: 350, deltas: flick(1) })).toEqual([1, 1]);
  });

  it('does not read coalesced momentum as a second flick', () => {
    let state = IDLE_WHEEL;
    const steps: Step[] = [];
    for (const { delta, at } of coalesce(flick(1, 60, 0.96), 3)) {
      const read = readWheel(state, delta, at);
      state = read.state;
      if (read.step) steps.push(read.step);
    }
    expect(steps).toEqual([1]);
  });

  it('does not step back on a stray reversed pixel as the fingers lift', () => {
    const deltas = flick(1);
    deltas.splice(12, 0, -3, -2);
    expect(play({ at: 0, deltas })).toEqual([1]);
  });

  it('steps once for a slow drag of small deltas', () => {
    const drag = Array.from({ length: 60 }, (_, i) => 2 + Math.sin(i / 5));
    expect(play({ at: 0, deltas: drag })).toEqual([1]);
  });

  it('ignores a brush under the threshold', () => {
    expect(play({ at: 0, deltas: [2, 3, 2, 1] })).toEqual([]);
  });
});

describe('readWheel — mouse', () => {
  /** Notches as `[time, delta]` pairs, played in order. */
  function notches(...plan: [number, number][]): Step[] {
    let state = IDLE_WHEEL;
    const steps: Step[] = [];
    for (const [time, delta] of plan) {
      const read = readWheel(state, delta, time);
      state = read.state;
      if (read.step) steps.push(read.step);
    }
    return steps;
  }

  it('steps once for a single notch', () => {
    expect(notches([0, 100])).toEqual([1]);
  });

  it('steps once for a spin, however many notches it is', () => {
    expect(notches([0, 100], [40, 100], [80, 100], [120, 100], [160, 100])).toEqual([1]);
  });

  it('steps again after a pause', () => {
    expect(notches([0, 100], [QUIET_MS + 50, 100])).toEqual([1, 1]);
  });

  it('turns round inside the pause, too', () => {
    expect(notches([0, 100], [60, -100])).toEqual([1, -1]);
  });
});

describe('wheelPixels', () => {
  it('passes pixels through', () => {
    expect(wheelPixels(40, 0, 800)).toBe(40);
  });

  it('reads lines as 16px, so a Firefox notch of 3 lines clears the threshold', () => {
    expect(wheelPixels(3, 1, 800)).toBe(48);
  });

  it('reads pages as the viewport height', () => {
    expect(wheelPixels(-1, 2, 800)).toBe(-800);
  });
});
