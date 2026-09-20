/**
 * How visible a screen's copy is, given where the penguin actually is.
 *
 * The page scroll jumps to a stop the instant the gesture lands, but the penguin takes a whole
 * walk to get there — so anything keyed to the scroll position (a `view()` timeline, an
 * IntersectionObserver) announces the next chapter while the reader is still looking at the
 * previous one. Two flicks and "Better with a friend." is on screen over the set-a-goal scenery.
 * Keying it to the walk instead means the words arrive with the scenery they describe.
 *
 * `shown` is the walker's position in stops (lib/walker.ts), `index` the screen's own stop.
 */

/** Distance, in stops, at which a screen's copy starts to appear. */
export const FADE_IN = 0.38;
/** Distance at which it is fully opaque: a little before the walk ends, so it settles with it. */
export const FADE_FULL = 0.08;

export function copyOpacity(shown: number, index: number): number {
  const distance = Math.abs(shown - index);
  if (distance >= FADE_IN) return 0;
  if (distance <= FADE_FULL) return 1;
  return (FADE_IN - distance) / (FADE_IN - FADE_FULL);
}
