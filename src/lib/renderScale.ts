/**
 * How many device pixels the scene is allowed to draw per CSS pixel.
 *
 * Rive redraws the whole world every frame, so the canvas's pixel count, not its CSS size, is
 * what sets the frame time. The React hook sizes the drawing surface at the display's full
 * device pixel ratio; on a 2x screen that is a 5.1 megapixel full-screen canvas. Measured on
 * one machine, the same scene ran at 8 fps there against 36 fps at 1.3 megapixels — the cost
 * is roughly linear in pixels once the canvas is past about a megapixel.
 *
 * 1.5 is the point where that trade stops paying: the world is flat vector art with no fine
 * detail or hairlines, so the extra half-ratio over 1 still sharpens the penguin outlines and
 * the stop copy's drop shadow, while the jump from 1.5 to 2 costs 78% more pixels for a
 * difference that needs a loupe.
 */
export const MAX_PIXEL_RATIO = 1.5;

/**
 * The cap above is about big canvases, and a phone's is small: 412x915 CSS pixels is a third of
 * a megapixel. Held to 1.5 on a 3x screen, the board's and the banner's 8px labels are drawn at
 * half the display's resolution and read as smudges. So a small canvas may go past the cap for
 * as long as its drawing surface stays inside this many device pixels — about what a 1440x900
 * desktop window already draws at 1.5 — and a large one is held at the cap as before.
 */
export const PIXEL_BUDGET = 2_000_000;
/** Past this, the extra density is invisible even on the densest phone screens. */
export const MAX_DENSE_RATIO = 3;

/**
 * Never below 1 — a ratio under 1 would render the scene smaller than its own canvas and then
 * stretch it back up, which is blurrier than anything the cap is trying to buy. Browsers do
 * report fractional ratios below 1 when the page is zoomed out.
 *
 * `cssPixels` is the canvas's CSS width times height; left out, only the flat cap applies.
 */
export function renderPixelRatio(devicePixelRatio: number, cssPixels = Number.POSITIVE_INFINITY): number {
  if (!Number.isFinite(devicePixelRatio) || devicePixelRatio < 1) return 1;
  const withinBudget = cssPixels > 0 ? Math.sqrt(PIXEL_BUDGET / cssPixels) : MAX_PIXEL_RATIO;
  const ceiling = Math.max(MAX_PIXEL_RATIO, Math.min(MAX_DENSE_RATIO, withinBudget));
  return Math.min(devicePixelRatio, ceiling);
}

/*
 * Adaptive resolution.
 *
 * Measured, the scene itself costs about 7ms a frame and every megapixel of canvas adds about
 * another 7: a 1440x900 window at 1x runs at ~71fps, the same window on a 2x display at ~36.
 * The cap above cannot know which GPU it is on, so after load the page times its own frames
 * and, while they stay slow, gives back resolution a step at a time. A fast GPU never steps;
 * a slow one trades a little sharpness for smoothness.
 */

/**
 * Median frame time above which the reader can see the stutter: slower than 40fps.
 *
 * Not tighter. Frame times arrive in whole display refreshes, so on a 144Hz screen a scene that
 * misses one vsync reads 20.8ms — 48fps, smooth to the eye — and a 20ms threshold would trade
 * sharpness away for it. At 25 that screen only steps at 36fps, and a 60Hz screen still steps at
 * its first real miss, 30fps.
 */
export const SLOW_FRAME_MS = 25;
/**
 * The smallest step down per verdict: 1.5 → 1.25 → 1. From higher up — a phone starting near
 * 2.5 — each step takes half the distance to the floor instead, so two verdicts still reach a
 * smooth rate: 2.5 → 1.75 → 1.375.
 */
export const RATIO_STEP = 0.25;
/** Never below the canvas's own size — see renderPixelRatio. */
export const MIN_PIXEL_RATIO = 1;
/** How many verdicts to take before settling, so a one-off hitch cannot walk it to the floor. */
export const MAX_ADAPT_STEPS = 2;

/** The ratio to draw at next, given the one in use and how its frames measured. Only ever lowers. */
export function nextPixelRatio(current: number, medianFrameMs: number): number {
  if (!(medianFrameMs > SLOW_FRAME_MS) || current <= MIN_PIXEL_RATIO) return current;
  const step = Math.max(RATIO_STEP, (current - MIN_PIXEL_RATIO) / 2);
  return Math.max(MIN_PIXEL_RATIO, current - step);
}

/** The median of a run of frame intervals, ignoring the first few that include startup work. */
export function medianFrameMs(intervals: readonly number[], skip = 5): number {
  const sorted = intervals.slice(skip).sort((a, b) => a - b);
  if (sorted.length === 0) return 0;
  return sorted[Math.floor(sorted.length / 2)];
}
