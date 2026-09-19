/**
 * The penguin walks the reader through the world instead of the world jumping to the scroll
 * position. Each frame the world advances toward the scroll target at walking pace, so however
 * hard the page is flicked, the legs and the ground never disagree by more than a waddle.
 *
 * Poses match `walkPose` in the Rive file: 0 facing the viewer, 1 standing sideways, 2 walking.
 * Facing matches `walkFacing`: 0 right (down the page), 1 left (back up it).
 */
export type Pose = 0 | 1 | 2;
export type Facing = 0 | 1;

export type WalkerState = {
  /** Where the world is drawn, in stops. Trails the scroll target while walking. */
  readonly shown: number;
  readonly pose: Pose;
  readonly facing: Facing;
  /** Until this time the penguin is still turning from the viewer, and the world waits. */
  readonly turnUntil: number;
};

/** Stops per second: a stop is one hero-width, so this is roughly 2.2s between stops. */
export const WALK_SPEED = 0.45;
/** Length of the turn-to-side animation in the file (15 frames at 60fps). */
export const TURN_MS = 250;
/** Closer than this to the target counts as arrived: about 3 units of the 1920-wide world. */
const ARRIVED = 0.0015;

export const INITIAL_WALKER: WalkerState = { shown: 0, pose: 0, facing: 0, turnUntil: 0 };

export function stepWalker(state: WalkerState, target: number, now: number, dt: number): WalkerState {
  const gap = target - state.shown;

  if (Math.abs(gap) <= ARRIVED) {
    const stop = Math.round(target);
    const atStop = Math.abs(target - stop) <= ARRIVED;
    return { ...state, shown: target, pose: atStop ? 0 : 1 };
  }

  const facing: Facing = gap < 0 ? 1 : 0;
  if (state.pose === 0) {
    return { ...state, pose: 2, facing, turnUntil: now + TURN_MS };
  }
  if (now < state.turnUntil) {
    return { ...state, pose: 2, facing };
  }

  const step = WALK_SPEED * dt;
  const shown = state.shown + Math.max(-step, Math.min(step, gap));
  return { ...state, shown, pose: 2, facing };
}

/** True when another frame would change nothing: the loop can sleep until the next scroll. */
export function isSettled(state: WalkerState, target: number): boolean {
  return Math.abs(target - state.shown) <= ARRIVED && state.pose !== 2;
}
