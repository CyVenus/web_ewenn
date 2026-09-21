/**
 * Tells one scroll gesture from the next, from wheel events alone.
 *
 * The home page moves one stop per gesture, so the whole problem is knowing where a gesture ends.
 * A mouse wheel makes that easy: notches, then silence. A trackpad does not — a flick keeps firing
 * momentum events for a second or two after the fingers lift, and no browser says which events are
 * fingers and which are momentum. Silence was the only rule this used to have, and it swallowed
 * every swipe that landed while momentum was still arriving: flick down, flick straight back up,
 * and nothing happened; flick on from the middle stop, and the page stayed put. Both lasted until
 * the pad had been left alone for long enough, which on a hard flick is two seconds.
 *
 * So a gesture now ends in three ways, the last two being things momentum never does:
 *
 * - **Silence** — `QUIET_MS` without an event. Still the whole story for a mouse.
 * - **It turns round.** Momentum decays toward zero and never changes sign, so delta against the
 *   gesture is the reader going back. Gathered to `THRESHOLD` first, and forgotten the moment the
 *   gesture's own direction resumes, so a stray reversed pixel as the fingers lift cannot step.
 * - **It picks up again.** Momentum only ever dies away, so a rise after the fall is fingers. The
 *   rise is judged on a short average and has to treble the lowest point: Chrome sums the wheel
 *   events that arrive inside one busy frame, and a scene this heavy keeps it busy, so a single
 *   event twice its neighbours is ordinary momentum and must not read as a new swipe.
 */

/** Accumulated delta that counts as the reader meaning it, rather than a brushed trackpad. */
export const THRESHOLD = 12;
/** Wheel silence that ends a gesture. Momentum fires every frame until it stops, so a gap this
 *  long means it has. */
export const QUIET_MS = 180;
/** Events averaged to judge how fast the gesture is going. Three is enough to flatten one
 *  coalesced event and few enough to notice a new swipe within a couple of frames. */
const SMOOTHING = 3;
/** Below this share of its peak the gesture counts as dying away, and a rise can be looked for. */
const FALLEN = 0.5;
/** How many times its lowest point the gesture has to climb back to before it is a new swipe. */
const RISE = 3;
/** And never on less than this, in pixels per event: the tail of a flick crawls along at 1–3, and
 *  trebling that is noise, not a hand. */
const RISE_FLOOR = 8;
/** The soonest a gesture can step again in the direction it already went. A swipe that speeds up
 *  and slows down under the fingers can dip and climb inside one movement; a second, deliberate
 *  flick is never this quick. */
const RESTEP_MS = 300;

export type Step = -1 | 0 | 1;

export type WheelGesture = {
  /** When the last wheel event arrived, in ms. */
  readonly lastAt: number;
  /** The way the gesture went when it last stepped; 0 while it is still gathering. */
  readonly direction: Step;
  /** Delta gathered toward a step: either way before the gesture has stepped, only against it after. */
  readonly pending: number;
  /** The sizes of the last few events with the gesture, newest last. */
  readonly recent: readonly number[];
  /** The fastest the gesture has gone since it last stepped. */
  readonly peak: number;
  /** The slowest since it started dying away; `null` until it has. */
  readonly trough: number | null;
  /** When the gesture last stepped. */
  readonly steppedAt: number;
};

export const IDLE_WHEEL: WheelGesture = {
  lastAt: Number.NEGATIVE_INFINITY,
  direction: 0,
  pending: 0,
  recent: [],
  peak: 0,
  trough: null,
  steppedAt: Number.NEGATIVE_INFINITY,
};

/** A wheel event's vertical delta in pixels, whatever unit the browser reported it in. */
export function wheelPixels(deltaY: number, deltaMode: number, pageHeight: number): number {
  if (deltaMode === 1) return deltaY * 16; // DOM_DELTA_LINE
  if (deltaMode === 2) return deltaY * pageHeight; // DOM_DELTA_PAGE
  return deltaY;
}

/** Feeds one wheel event to the gesture: the next state, and which way to step (0 for not at all). */
export function readWheel(
  state: WheelGesture,
  delta: number,
  time: number,
): { state: WheelGesture; step: Step } {
  const current = time - state.lastAt > QUIET_MS ? IDLE_WHEEL : state;
  const next: WheelGesture = { ...current, lastAt: time };
  const sign = Math.sign(delta) as Step;
  if (sign === 0) return { state: next, step: 0 };
  const size = Math.abs(delta);

  // Still gathering, or turning round: either way it is pixels toward a step, counted with sign.
  if (next.direction === 0 || sign !== next.direction) {
    const pending = next.pending + delta;
    if (Math.abs(pending) < THRESHOLD) return { state: { ...next, pending }, step: 0 };
    return stepped(next, Math.sign(pending) as Step, [size], time);
  }

  // With the gesture: momentum, unless it has picked up again after dying away. `pending` is
  // cleared because the gesture's own direction has resumed — any reversal it held was noise.
  const recent = [...next.recent, size].slice(-SMOOTHING);
  const speed = average(recent);
  if (next.trough === null) {
    const peak = Math.max(next.peak, speed);
    const trough = speed < peak * FALLEN ? speed : null;
    return { state: { ...next, pending: 0, recent, peak, trough }, step: 0 };
  }
  if (speed >= Math.max(RISE_FLOOR, next.trough * RISE) && time - next.steppedAt >= RESTEP_MS) {
    return stepped(next, next.direction, recent, time);
  }
  return { state: { ...next, pending: 0, recent, trough: Math.min(next.trough, speed) }, step: 0 };
}

function stepped(
  state: WheelGesture,
  direction: Step,
  recent: readonly number[],
  time: number,
): { state: WheelGesture; step: Step } {
  return {
    state: { ...state, direction, pending: 0, recent, peak: average(recent), trough: null, steppedAt: time },
    step: direction,
  };
}

function average(values: readonly number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}
