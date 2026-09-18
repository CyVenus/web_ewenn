/*
 * Zoom lock.
 *
 * A page cannot switch browser zoom off. There is no API for it, `user-scalable=no` is advisory
 * at best — desktop ignores it, and so has iOS Safari since 10 — and the browser's own menu is
 * out of reach whatever the page does. What a page CAN do is two things, and the lock does both:
 *
 *   1. Swallow the gestures that ask for zoom: ctrl/cmd with the wheel, ctrl/cmd with plus or
 *      minus, and the pinch Safari reports as a `gesture*` event. This is how zoom is actually
 *      reached, so it is the half that does the work.
 *   2. Notice a zoom level that changed anyway — the menu, a trackpad gesture the OS handled, a
 *      level the browser had saved for this origin — and paint the inverse as CSS `zoom` on
 *      <html>, so the document lays out at the size it had before and the visitor sees no change.
 *
 * Either half alone is thin: (1) leaves the menu working, and (2) would repaint the whole page on
 * every notch of a ctrl-wheel on its way to undoing it.
 */

declare global {
  /** Safari's pinch events. Non-standard, and the only handle on a pinch that engine offers. */
  interface WindowEventMap {
    gesturestart: Event;
    gesturechange: Event;
    gestureend: Event;
  }
}

/** What the lock reads off the window. Two numbers are enough to tell zoom from everything else. */
export type ViewportSample = {
  /** devicePixelRatio: the zoom factor multiplied by the display's own scale. */
  readonly dpr: number;
  /** innerWidth: the CSS viewport, which zoom divides and a change of display does not. */
  readonly width: number;
};

/** Chrome's zoom ladder runs 25%–500%. The inverse of that range is all a counter-scale needs. */
export const SCALE_MIN = 0.2;
export const SCALE_MAX = 5;

/** Zoom steps like 110% leave a rounding tail in innerWidth, so the match cannot be exact. */
export const WIDTH_TOLERANCE = 0.02;

export const sampleViewport = (view: Window): ViewportSample => ({
  dpr: view.devicePixelRatio,
  width: view.innerWidth,
});

/**
 * devicePixelRatio moves for two unrelated reasons: the visitor zoomed, or the window met a
 * display with a different scale — a second monitor, mostly. Counter-scaling the second one would
 * shrink the site to half size on the better screen, which is a worse bug than the one the lock
 * exists to fix, so the two have to be told apart.
 *
 * `innerWidth * devicePixelRatio` is the window's width in real device pixels, and that is what
 * separates them: zoom holds it constant — the CSS viewport shrinks by exactly the factor the
 * ratio grows — and moving to another display does not.
 */
export function isZoomChange(before: ViewportSample, after: ViewportSample): boolean {
  if (before.dpr === after.dpr) return false;
  const was = before.width * before.dpr;
  const is = after.width * after.dpr;
  if (was <= 0 || is <= 0) return false;
  return Math.abs(was - is) <= Math.max(was, is) * WIDTH_TOLERANCE;
}

/** The factor that undoes `currentDpr` worth of zoom, given the level the page loaded at. */
export function counterScale(baselineDpr: number, currentDpr: number): number {
  if (!(baselineDpr > 0) || !(currentDpr > 0)) return 1;
  const scale = baselineDpr / currentDpr;
  if (!Number.isFinite(scale)) return 1;
  return Math.min(Math.max(scale, SCALE_MIN), SCALE_MAX);
}

/** The shape of a key event the lock needs: a plain object in tests, a real one in a browser. */
export type ZoomKeyEvent = {
  key: string;
  code: string;
  ctrlKey: boolean;
  metaKey: boolean;
  altKey: boolean;
};

/*
 * Both `key` and `code` are read, because neither alone covers every layout: on AZERTY and on
 * German keyboards the zoom-in character sits on a different physical key than it does on US
 * QWERTY, and on the numpad the character is the same one but the key is not.
 */
const ZOOM_KEYS = new Set(['+', '-', '=', '_']);
const ZOOM_CODES = new Set(['Equal', 'Minus', 'NumpadAdd', 'NumpadSubtract']);
const RESET_CODES = new Set(['Digit0', 'Numpad0']);

const isZoomChord = (event: ZoomKeyEvent) => (event.ctrlKey || event.metaKey) && !event.altKey;

export function isZoomKey(event: ZoomKeyEvent): boolean {
  return isZoomChord(event) && (ZOOM_KEYS.has(event.key) || ZOOM_CODES.has(event.code));
}

/**
 * ctrl/cmd + 0 is deliberately NOT swallowed. It is the one chord that cannot make the page any
 * bigger or smaller than it already is, and it is the only way out of the case the lock cannot
 * detect: a zoom level the browser had saved for this origin *before* the page loaded, which JS
 * cannot read and which therefore becomes the baseline the lock faithfully preserves. Pressing it
 * hands the visitor a browser at 100%, and the handler takes that as the new normal.
 */
export function isZoomResetKey(event: ZoomKeyEvent): boolean {
  return isZoomChord(event) && (event.key === '0' || RESET_CODES.has(event.code));
}

/*
 * The document's own scale, kept at module level because the lock is a property of the document
 * and not of any one component. useViewportArtboard reads the design viewport through it: at 200%
 * zoom innerWidth is 720 where the layout is 1440 wide, and handing the phone artboard to a
 * counter-scaled desktop would undo the lock on the one layer that covers the whole screen.
 */
let appliedScale = 1;

export const zoomLockScale = (): number => appliedScale;

/** The viewport the document is laid out against: the real one, divided by the applied scale. */
export function designViewport(view: Window): { width: number; height: number } {
  return { width: view.innerWidth / appliedScale, height: view.innerHeight / appliedScale };
}

/** `CSS` hangs off the global rather than off the `Window` interface, hence the narrowing. */
type WindowWithCSS = Window & { CSS?: { supports?: (property: string, value: string) => boolean } };

const canCounterScale = (view: Window): boolean => {
  const css = (view as WindowWithCSS).CSS;
  return typeof css?.supports === 'function' && css.supports('zoom', '0.5');
};

/**
 * Installs the lock on a window and returns its teardown.
 *
 * What `zoom` on <html> reaches, and what it does not: it rescales every length, and it divides
 * the initial containing block, so the document is laid out at the width it had before. It does
 * NOT divide viewport units — `100lvh` under `zoom: 0.5` measures the real, halved viewport and
 * then paints at half again — and it does not reach media queries, which keep seeing the real
 * viewport. So the three boxes that have to cover the window read `--vp-h-*` rather than the
 * unit, and the short-viewport rules in global.css stay as the net under everything else.
 */
export function installZoomLock(view: Window): () => void {
  const root = view.document.documentElement;
  const compensates = canCounterScale(view);
  let baselineDpr = view.devicePixelRatio;
  let last = sampleViewport(view);
  let resolution: MediaQueryList | null = null;
  let resetTimer: number | undefined;

  const paint = (scale: number) => {
    if (!compensates || scale === appliedScale) return;
    appliedScale = scale;
    if (scale === 1) {
      for (const property of ['zoom', 'width', '--vp-h-small', '--vp-h-large']) {
        root.style.removeProperty(property);
      }
      return;
    }
    root.style.setProperty('zoom', String(scale));
    // clientWidth rather than innerWidth: a document page carries a scrollbar, and laying the
    // root out to include it is how a zoom lock grows a horizontal scrollbar of its own. Left
    // unrounded for the same reason — at 110% the design width is 1439.9px, and 1440 overflows.
    const width = root.clientWidth || view.innerWidth;
    const height = root.clientHeight || view.innerHeight;
    // The width is a no-op wherever the initial containing block is already divided, which is
    // every engine that implements `zoom` to spec. It is insurance for the ones that do not.
    root.style.setProperty('width', `${width / scale}px`);
    root.style.setProperty('--vp-h-small', `${height / scale}px`);
    root.style.setProperty('--vp-h-large', `${height / scale}px`);
  };

  const settle = () => {
    const next = sampleViewport(view);
    // A ratio that moved without the device-pixel width holding still is a different display and
    // not a zoom: that level is the visitor's new normal, and there is nothing to undo.
    if (next.dpr !== last.dpr && !isZoomChange(last, next)) baselineDpr = next.dpr;
    last = next;
    paint(counterScale(baselineDpr, next.dpr));
  };

  /*
   * A resolution query is the one thing that fires on every zoom change; `resize` does too on
   * desktop, but not dependably when the window is maximised. A query only reports on its own
   * ratio, so it is re-armed against the new one each time it fires.
   */
  const watchResolution = () => {
    if (typeof view.matchMedia !== 'function') return;
    resolution = view.matchMedia(`(resolution: ${view.devicePixelRatio}dppx)`);
    resolution.addEventListener('change', onResolution);
  };

  const onResolution = () => {
    resolution?.removeEventListener('change', onResolution);
    settle();
    watchResolution();
  };

  const onResize = () => settle();

  const onWheel = (event: WheelEvent) => {
    // ctrl+wheel is the desktop zoom gesture, and it is also how a trackpad pinch is delivered.
    if (event.ctrlKey || event.metaKey) event.preventDefault();
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (isZoomKey(event)) {
      event.preventDefault();
      return;
    }
    if (!isZoomResetKey(event)) return;
    // Let the browser reset itself, then re-anchor to whatever level that landed on.
    view.clearTimeout(resetTimer);
    resetTimer = view.setTimeout(() => {
      baselineDpr = view.devicePixelRatio;
      last = sampleViewport(view);
      paint(1);
    }, 0);
  };

  // Safari's own pinch events. `touch-action` in global.css stops the gesture on every other
  // engine; on Safari these are what stop it.
  const onGesture = (event: Event) => event.preventDefault();

  const onTouchMove = (event: TouchEvent) => {
    if (event.touches.length > 1) event.preventDefault();
  };

  const active = { passive: false } as const;
  view.addEventListener('wheel', onWheel, active);
  view.addEventListener('keydown', onKeyDown);
  view.addEventListener('gesturestart', onGesture, active);
  view.addEventListener('gesturechange', onGesture, active);
  view.addEventListener('gestureend', onGesture, active);
  view.addEventListener('touchmove', onTouchMove, active);
  view.addEventListener('resize', onResize);
  watchResolution();

  // No options on the way out: only `capture` takes part in matching a listener, and none of
  // these capture. Passing `active` here is a type error rather than a no-op.
  return () => {
    view.removeEventListener('wheel', onWheel);
    view.removeEventListener('keydown', onKeyDown);
    view.removeEventListener('gesturestart', onGesture);
    view.removeEventListener('gesturechange', onGesture);
    view.removeEventListener('gestureend', onGesture);
    view.removeEventListener('touchmove', onTouchMove);
    view.removeEventListener('resize', onResize);
    resolution?.removeEventListener('change', onResolution);
    resolution = null;
    view.clearTimeout(resetTimer);
    paint(1);
  };
}
