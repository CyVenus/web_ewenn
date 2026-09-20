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
 * Never below 1 — a ratio under 1 would render the scene smaller than its own canvas and then
 * stretch it back up, which is blurrier than anything the cap is trying to buy. Browsers do
 * report fractional ratios below 1 when the page is zoomed out.
 */
export function renderPixelRatio(devicePixelRatio: number): number {
  if (!Number.isFinite(devicePixelRatio) || devicePixelRatio < 1) return 1;
  return Math.min(devicePixelRatio, MAX_PIXEL_RATIO);
}
