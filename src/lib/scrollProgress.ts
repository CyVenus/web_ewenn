/**
 * How far the reader is along the world, in stops: 0 while the hero fills the screen, 1 once the
 * first stop's screen has reached the top, 1.5 halfway between that and the next, and so on.
 *
 * `tops` are the document offsets of each screen, hero first. Measured rather than assumed to be
 * multiples of the viewport height: on a phone the URL bar makes `innerHeight` disagree with the
 * `svh` the screens are sized in, and that drift would add up one stop at a time.
 */
export function stopProgress(scrollY: number, tops: readonly number[]): number {
  if (tops.length < 2 || scrollY <= tops[0]) return 0;
  for (let i = 1; i < tops.length; i += 1) {
    if (scrollY < tops[i]) {
      return i - 1 + (scrollY - tops[i - 1]) / (tops[i] - tops[i - 1]);
    }
  }
  return tops.length - 1;
}

/** The index of the position closest to `scrollY`; 0 when there are none. */
export function nearestIndex(scrollY: number, positions: readonly number[]): number {
  let best = 0;
  for (let i = 1; i < positions.length; i += 1) {
    if (Math.abs(positions[i] - scrollY) < Math.abs(positions[best] - scrollY)) best = i;
  }
  return best;
}
