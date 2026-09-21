/**
 * The three penguins at the friends stop greet each other when the walker arrives.
 *
 * Each penguin owns a trigger in the Rive file and raises a flipper when it fires. Firing all
 * three at once reads as a chorus, not a greeting — a greeting goes round the group, one bird
 * answering the last. So the site fires them in order, spaced by GREET_GAP_MS, and the stagger
 * lives here rather than in the file: three separate delayed triggers are something a test can
 * observe, whereas a delay baked into three Rive timelines is not.
 *
 * Fired once per arrival, not once per frame — the walker sits at the stop for as long as the
 * reader stays, and the settle check runs on every frame of it.
 */

/** Trigger names on the PenguinControls view model, in the order they should go off. */
export const GREET_TRIGGERS = ['highFive', 'highFive2', 'highFive3'] as const;

/** Between one penguin and the next. Long enough to read as an answer, short enough to be one beat. */
export const GREET_GAP_MS = 320;

/** Which stop the greeting belongs to: the friends stop is the only one with anyone to greet. */
export const GREET_STOP = 2;

/** How close to the stop counts as arrived. Matches the walker's own arrival tolerance. */
const ARRIVED = 0.01;

export function isAtGreetStop(shown: number): boolean {
  return Math.abs(shown - GREET_STOP) <= ARRIVED;
}

/**
 * Calls `fire` once per trigger, `GREET_GAP_MS` apart, and returns a cancel for the pending ones —
 * a reader who scrolls straight back off the stop should not be waved at from an empty screen.
 */
export function greet(
  fire: (trigger: string) => void,
  schedule: (fn: () => void, ms: number) => number = (fn, ms) => window.setTimeout(fn, ms),
  unschedule: (id: number) => void = (id) => window.clearTimeout(id),
): () => void {
  const timers: number[] = [];
  GREET_TRIGGERS.forEach((trigger, index) => {
    if (index === 0) {
      fire(trigger);
      return;
    }
    timers.push(schedule(() => fire(trigger), GREET_GAP_MS * index));
  });
  return () => timers.forEach(unschedule);
}
