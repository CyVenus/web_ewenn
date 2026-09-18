import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  counterScale,
  designViewport,
  installZoomLock,
  isZoomChange,
  isZoomKey,
  isZoomResetKey,
  SCALE_MAX,
  SCALE_MIN,
  zoomLockScale,
} from './zoomLock';

const chord = (over: Partial<Parameters<typeof isZoomKey>[0]>) => ({
  key: '',
  code: '',
  ctrlKey: false,
  metaKey: false,
  altKey: false,
  ...over,
});

/** A window at `width` CSS pixels and `dpr`, which is what a zoom level looks like from JS. */
function viewportIs(width: number, height: number, dpr: number) {
  Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: width });
  Object.defineProperty(window, 'innerHeight', { writable: true, configurable: true, value: height });
  Object.defineProperty(window, 'devicePixelRatio', { writable: true, configurable: true, value: dpr });
}

const rootStyle = () => document.documentElement.style;

describe('isZoomChange', () => {
  /* 1440x900 at 100% and 720x450 at 200% are the same window: the device pixels do not move. */
  it('recognises a zoom: the CSS viewport shrinks by the factor the ratio grows', () => {
    expect(isZoomChange({ dpr: 1, width: 1440 }, { dpr: 2, width: 720 })).toBe(true);
  });

  it('recognises a zoom out', () => {
    expect(isZoomChange({ dpr: 1, width: 1440 }, { dpr: 0.5, width: 2880 })).toBe(true);
  });

  it('tolerates the rounding a fractional step leaves behind', () => {
    // 1440 / 1.1 is 1309.09, and innerWidth is reported whole.
    expect(isZoomChange({ dpr: 1, width: 1440 }, { dpr: 1.1, width: 1309 })).toBe(true);
  });

  /*
   * The case that matters most: dragging the window onto a second, denser monitor also doubles
   * devicePixelRatio. Counter-scaling that would render the site at half size on the better
   * screen, so it has to read as a new normal rather than as a zoom.
   */
  it('rejects a change of display, where the device pixel width moves too', () => {
    expect(isZoomChange({ dpr: 1, width: 1440 }, { dpr: 2, width: 1440 })).toBe(false);
  });

  it('rejects a plain window resize', () => {
    expect(isZoomChange({ dpr: 1, width: 1440 }, { dpr: 1, width: 900 })).toBe(false);
  });

  it('rejects a sample with no width to compare', () => {
    expect(isZoomChange({ dpr: 1, width: 0 }, { dpr: 2, width: 0 })).toBe(false);
  });
});

describe('counterScale', () => {
  it('undoes the zoom it is given', () => {
    expect(counterScale(1, 2)).toBe(0.5);
    expect(counterScale(1, 0.5)).toBe(2);
    expect(counterScale(2, 4)).toBe(0.5);
  });

  it('is 1 when nothing has changed', () => {
    expect(counterScale(2, 2)).toBe(1);
  });

  it('clamps to the range a browser can actually zoom to', () => {
    expect(counterScale(1, 100)).toBe(SCALE_MIN);
    expect(counterScale(100, 1)).toBe(SCALE_MAX);
  });

  it('falls back to 1 on a ratio that cannot be divided', () => {
    expect(counterScale(0, 2)).toBe(1);
    expect(counterScale(1, 0)).toBe(1);
    expect(counterScale(Number.NaN, 2)).toBe(1);
  });
});

describe('isZoomKey', () => {
  it('matches the zoom chords on a US layout', () => {
    expect(isZoomKey(chord({ key: '+', ctrlKey: true }))).toBe(true);
    expect(isZoomKey(chord({ key: '-', ctrlKey: true }))).toBe(true);
    expect(isZoomKey(chord({ key: '=', ctrlKey: true }))).toBe(true);
    expect(isZoomKey(chord({ key: '-', metaKey: true }))).toBe(true);
  });

  it('matches by physical key, for the layouts that put the character elsewhere', () => {
    expect(isZoomKey(chord({ key: ']', code: 'NumpadAdd', ctrlKey: true }))).toBe(true);
    expect(isZoomKey(chord({ key: 'ß', code: 'Minus', ctrlKey: true }))).toBe(true);
  });

  it('leaves the key alone without the modifier', () => {
    expect(isZoomKey(chord({ key: '-' }))).toBe(false);
  });

  /* ctrl+alt+minus is somebody else's shortcut, not a zoom. */
  it('leaves alt chords alone', () => {
    expect(isZoomKey(chord({ key: '-', ctrlKey: true, altKey: true }))).toBe(false);
  });

  it('does not claim the reset chord', () => {
    expect(isZoomKey(chord({ key: '0', code: 'Digit0', ctrlKey: true }))).toBe(false);
  });
});

describe('isZoomResetKey', () => {
  it('matches ctrl and cmd with zero', () => {
    expect(isZoomResetKey(chord({ key: '0', ctrlKey: true }))).toBe(true);
    expect(isZoomResetKey(chord({ key: '0', metaKey: true }))).toBe(true);
    expect(isZoomResetKey(chord({ key: 'à', code: 'Digit0', ctrlKey: true }))).toBe(true);
  });

  it('ignores every other digit', () => {
    expect(isZoomResetKey(chord({ key: '1', code: 'Digit1', ctrlKey: true }))).toBe(false);
  });
});

describe('installZoomLock', () => {
  let uninstall: () => void;
  let originalCSS: typeof window.CSS;

  beforeEach(() => {
    originalCSS = window.CSS;
    // jsdom does not lay anything out, so `zoom` support has to be asserted rather than probed.
    Object.defineProperty(window, 'CSS', {
      writable: true,
      configurable: true,
      value: { supports: () => true },
    });
    viewportIs(1440, 900, 1);
    uninstall = installZoomLock(window);
  });

  afterEach(() => {
    uninstall();
    Object.defineProperty(window, 'CSS', { writable: true, configurable: true, value: originalCSS });
  });

  const fire = (event: Event) => {
    window.dispatchEvent(event);
    return event.defaultPrevented;
  };

  it('swallows a ctrl-wheel, which is both the wheel gesture and a trackpad pinch', () => {
    expect(fire(new WheelEvent('wheel', { ctrlKey: true, cancelable: true }))).toBe(true);
  });

  it('leaves an ordinary wheel alone, because that one only scrolls', () => {
    expect(fire(new WheelEvent('wheel', { cancelable: true }))).toBe(false);
  });

  it('swallows the zoom chords', () => {
    expect(fire(new KeyboardEvent('keydown', { key: '-', ctrlKey: true, cancelable: true }))).toBe(true);
    expect(fire(new KeyboardEvent('keydown', { key: '+', ctrlKey: true, cancelable: true }))).toBe(true);
  });

  it('lets an unmodified key through', () => {
    expect(fire(new KeyboardEvent('keydown', { key: '-', cancelable: true }))).toBe(false);
  });

  it("swallows Safari's pinch events", () => {
    expect(fire(new Event('gesturestart', { cancelable: true }))).toBe(true);
    expect(fire(new Event('gesturechange', { cancelable: true }))).toBe(true);
  });

  it('swallows a two-finger touchmove and leaves a one-finger scroll alone', () => {
    const pinch = new Event('touchmove', { cancelable: true });
    Object.defineProperty(pinch, 'touches', { value: { length: 2 } });
    expect(fire(pinch)).toBe(true);

    const scroll = new Event('touchmove', { cancelable: true });
    Object.defineProperty(scroll, 'touches', { value: { length: 1 } });
    expect(fire(scroll)).toBe(false);
  });

  it('counter-scales a zoom that arrived some other way', () => {
    act200();
    expect(zoomLockScale()).toBe(0.5);
    expect(rootStyle().getPropertyValue('zoom')).toBe('0.5');
    // The height the document lays out against: the real 450 undone by the scale.
    expect(rootStyle().getPropertyValue('--vp-h-large')).toBe('900px');
    expect(rootStyle().getPropertyValue('--vp-h-small')).toBe('900px');
  });

  it('publishes the design viewport, which is what picks the artboard', () => {
    act200();
    expect(designViewport(window)).toEqual({ width: 1440, height: 900 });
  });

  it('leaves a change of display alone', () => {
    viewportIs(1440, 900, 2);
    window.dispatchEvent(new Event('resize'));
    expect(zoomLockScale()).toBe(1);
    expect(rootStyle().getPropertyValue('zoom')).toBe('');
  });

  it('holds the scale when the window is resized while zoomed', () => {
    act200();
    viewportIs(600, 400, 2);
    window.dispatchEvent(new Event('resize'));
    expect(zoomLockScale()).toBe(0.5);
  });

  it('re-anchors on ctrl+0, the one way out of a zoom level saved before load', async () => {
    act200();
    viewportIs(1440, 900, 1);
    window.dispatchEvent(new KeyboardEvent('keydown', { key: '0', ctrlKey: true, cancelable: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(zoomLockScale()).toBe(1);
    expect(rootStyle().getPropertyValue('zoom')).toBe('');
  });

  it('lets ctrl+0 reach the browser', () => {
    expect(fire(new KeyboardEvent('keydown', { key: '0', ctrlKey: true, cancelable: true }))).toBe(false);
  });

  it('gives the page back on teardown', () => {
    act200();
    uninstall();
    uninstall = () => undefined;
    expect(zoomLockScale()).toBe(1);
    expect(rootStyle().getPropertyValue('zoom')).toBe('');
    expect(fire(new WheelEvent('wheel', { ctrlKey: true, cancelable: true }))).toBe(false);
  });

  it('does nothing at all where `zoom` is not supported', () => {
    uninstall();
    Object.defineProperty(window, 'CSS', {
      writable: true,
      configurable: true,
      value: { supports: () => false },
    });
    uninstall = installZoomLock(window);
    act200();
    expect(zoomLockScale()).toBe(1);
    expect(rootStyle().getPropertyValue('zoom')).toBe('');
    // The gestures are still swallowed; only the compensation stands down.
    expect(fire(new WheelEvent('wheel', { ctrlKey: true, cancelable: true }))).toBe(true);
  });
});

/** Zooms a 1440x900 window to 200%, which is the 720x450 viewport at ratio 2 a browser reports. */
function act200() {
  Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 720 });
  Object.defineProperty(window, 'innerHeight', { writable: true, configurable: true, value: 450 });
  Object.defineProperty(window, 'devicePixelRatio', { writable: true, configurable: true, value: 2 });
  window.dispatchEvent(new Event('resize'));
}

afterEach(() => {
  vi.restoreAllMocks();
});
