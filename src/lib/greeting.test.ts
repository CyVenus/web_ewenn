import { describe, expect, it } from 'vitest';
import { GREET_GAP_MS, GREET_TRIGGERS, greet, isAtGreetStop } from './greeting';

/** A schedule/unschedule pair that records what was asked for instead of waiting for it. */
function fakeClock() {
  const pending = new Map<number, { fn: () => void; ms: number }>();
  let next = 1;
  return {
    pending,
    schedule: (fn: () => void, ms: number) => {
      const id = next++;
      pending.set(id, { fn, ms });
      return id;
    },
    unschedule: (id: number) => pending.delete(id),
    runAll: () => {
      [...pending.values()].sort((a, b) => a.ms - b.ms).forEach(({ fn }) => fn());
      pending.clear();
    },
  };
}

describe('isAtGreetStop', () => {
  it('is true only at the friends stop', () => {
    expect(isAtGreetStop(2)).toBe(true);
    expect(isAtGreetStop(1)).toBe(false);
    expect(isAtGreetStop(0)).toBe(false);
  });

  it('is false the whole way there', () => {
    expect(isAtGreetStop(1.5)).toBe(false);
    expect(isAtGreetStop(1.9)).toBe(false);
  });
});

describe('greet', () => {
  it('fires the first penguin straight away and schedules the rest', () => {
    const fired: string[] = [];
    const clock = fakeClock();
    greet((t) => fired.push(t), clock.schedule, clock.unschedule);
    expect(fired).toEqual([GREET_TRIGGERS[0]]);
    expect(clock.pending.size).toBe(GREET_TRIGGERS.length - 1);
  });

  it('spaces them one gap apart, in order', () => {
    const clock = fakeClock();
    greet(() => undefined, clock.schedule, clock.unschedule);
    expect([...clock.pending.values()].map((p) => p.ms)).toEqual([GREET_GAP_MS, GREET_GAP_MS * 2]);
  });

  it('ends with every penguin greeted exactly once', () => {
    const fired: string[] = [];
    const clock = fakeClock();
    greet((t) => fired.push(t), clock.schedule, clock.unschedule);
    clock.runAll();
    expect(fired).toEqual([...GREET_TRIGGERS]);
  });

  it('cancels the pending ones when the reader leaves', () => {
    const fired: string[] = [];
    const clock = fakeClock();
    const cancel = greet((t) => fired.push(t), clock.schedule, clock.unschedule);
    cancel();
    clock.runAll();
    expect(fired).toEqual([GREET_TRIGGERS[0]]);
  });
});
