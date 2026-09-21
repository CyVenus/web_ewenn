import { describe, expect, it } from 'vitest';
import { FADE_FULL, FADE_IN, copyOpacity } from './copyReveal';

describe('copyOpacity', () => {
  it('is fully opaque at the stop', () => {
    expect(copyOpacity(1, 1)).toBe(1);
  });

  it('is invisible a whole stop away', () => {
    expect(copyOpacity(0, 1)).toBe(0);
    expect(copyOpacity(2, 1)).toBe(0);
  });

  it('stays hidden for the first half of the walk', () => {
    // Two flicks from the hero used to put stop 2's copy on screen over stop 1's scenery.
    expect(copyOpacity(1.5, 2)).toBe(0);
  });

  it('ramps in over the last stretch of the approach', () => {
    const early = copyOpacity(1 - FADE_IN + 0.01, 1);
    const late = copyOpacity(1 - FADE_FULL - 0.01, 1);
    expect(early).toBeGreaterThan(0);
    expect(early).toBeLessThan(late);
    expect(late).toBeLessThan(1);
  });

  it('reads the same walking either way', () => {
    expect(copyOpacity(0.8, 1)).toBeCloseTo(copyOpacity(1.2, 1));
  });

  it('never leaves the 0..1 range', () => {
    for (let shown = -1; shown <= 3; shown += 0.05) {
      const opacity = copyOpacity(shown, 1);
      expect(opacity).toBeGreaterThanOrEqual(0);
      expect(opacity).toBeLessThanOrEqual(1);
    }
  });
});
