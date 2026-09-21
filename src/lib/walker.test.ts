import { describe, expect, it } from 'vitest';
import {
  INITIAL_WALKER,
  MAX_PACE,
  TURN_MS,
  WALK_SPEED,
  isSettled,
  stepWalker,
  walkPace,
  type WalkerState,
} from './walker';

/** Frame-steps a whole journey at 60fps and reports how long it took, in seconds. */
function journey(from: number, to: number): number {
  let state = at({ shown: from, pose: 2, turnUntil: 0 });
  let t = 0;
  while (Math.abs(to - state.shown) > 0.0015 && t < 30) {
    state = stepWalker(state, to, 10_000 + t * 1000, 1 / 60);
    t += 1 / 60;
  }
  return t;
}

describe('walkPace', () => {
  it('is a plain walk once the gap is short', () => {
    expect(walkPace(0.3)).toBe(WALK_SPEED);
    expect(walkPace(-0.3)).toBe(WALK_SPEED);
  });

  it('speeds up with the distance, up to the cap', () => {
    expect(walkPace(1)).toBeGreaterThan(WALK_SPEED);
    expect(walkPace(2)).toBe(MAX_PACE);
    expect(walkPace(9)).toBe(MAX_PACE);
  });
});

describe('journey times', () => {
  it('leaves a single stop close to the walk it always was', () => {
    expect(journey(0, 1)).toBeGreaterThan(1.9);
    expect(journey(0, 1)).toBeLessThan(2.25);
  });

  it('brings the long trip home well under the flat-pace 4.4s', () => {
    expect(journey(2, 0)).toBeLessThan(3.5);
  });
});

const at = (overrides: Partial<WalkerState>): WalkerState => ({ ...INITIAL_WALKER, ...overrides });

describe('stepWalker', () => {
  it('turns before it walks, and the world waits for the turn', () => {
    const turning = stepWalker(INITIAL_WALKER, 1, 1000, 1 / 60);
    expect(turning).toMatchObject({ pose: 2, facing: 0, shown: 0, turnUntil: 1000 + TURN_MS });
    const stillTurning = stepWalker(turning, 1, 1000 + TURN_MS - 1, 1 / 60);
    expect(stillTurning.shown).toBe(0);
  });

  it('walks the last stretch at walking pace', () => {
    const walking = at({ pose: 2, turnUntil: 0 });
    const next = stepWalker(walking, 0.5, 2000, 0.1);
    expect(next.shown).toBeCloseTo(WALK_SPEED * 0.1);
  });

  it('hurries when it is far behind, but never past MAX_PACE', () => {
    const walking = at({ pose: 2, turnUntil: 0 });
    const next = stepWalker(walking, 5, 2000, 0.1);
    expect(next.shown).toBeCloseTo(MAX_PACE * 0.1);
  });

  it('does not overshoot the target', () => {
    const next = stepWalker(at({ shown: 0.99, pose: 2 }), 1, 2000, 1);
    expect(next.shown).toBe(1);
  });

  it('faces left when the reader scrolls back up', () => {
    const next = stepWalker(at({ shown: 1, pose: 1 }), 0.5, 2000, 1 / 60);
    expect(next).toMatchObject({ facing: 1, pose: 2 });
    expect(next.shown).toBeLessThan(1);
  });

  it('carries on from standing sideways without turning again', () => {
    const next = stepWalker(at({ shown: 0.4, pose: 1 }), 0.8, 2000, 0.1);
    expect(next.shown).toBeGreaterThan(0.4);
  });

  it('stands sideways when it catches up between stops', () => {
    const next = stepWalker(at({ shown: 0.6, pose: 2 }), 0.6, 2000, 1 / 60);
    expect(next.pose).toBe(1);
  });

  it('turns to the viewer when it arrives at a stop', () => {
    const next = stepWalker(at({ shown: 1, pose: 2 }), 1, 2000, 1 / 60);
    expect(next.pose).toBe(0);
  });
});

describe('isSettled', () => {
  it('keeps the loop running while walking', () => {
    expect(isSettled(at({ shown: 1, pose: 2 }), 1)).toBe(false);
  });

  it('lets the loop sleep once arrived and standing', () => {
    expect(isSettled(at({ shown: 1, pose: 0 }), 1)).toBe(true);
    expect(isSettled(at({ shown: 0.5, pose: 1 }), 0.5)).toBe(true);
  });
});
