import { useEffect } from 'react';
import { nearestIndex } from '../lib/scrollProgress';

/** Accumulated wheel delta that counts as the reader meaning it, rather than a brushed trackpad. */
const WHEEL_THRESHOLD = 12;
/** Wheel silence that ends a gesture. Trackpad momentum keeps firing well past the lift, and
 *  every event of it belongs to the gesture that started it — otherwise one flick skips stops. */
const GESTURE_QUIET_MS = 180;
const SWIPE_THRESHOLD = 40;
/** How long after the last scroll event the page counts as settled. */
const SETTLE_MS = 160;

const FORWARD_KEYS = new Set(['ArrowDown', 'PageDown']);
const BACK_KEYS = new Set(['ArrowUp', 'PageUp']);

/** Resting positions: the top of each screen, then the very bottom where the footer lives. */
function restingPositions(): number[] {
  const tops = Array.from(document.querySelectorAll<HTMLElement>('[data-screen]'), (screen) => {
    return Math.round(screen.getBoundingClientRect().top + window.scrollY);
  });
  const bottom = document.documentElement.scrollHeight - window.innerHeight;
  const last = tops[tops.length - 1] ?? 0;
  return bottom > last + 1 ? [...tops, bottom] : tops;
}

function isTyping(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName));
}

/**
 * One gesture, one stop. However the reader scrolls — a wheel notch, a trackpad fling, a swipe,
 * a key — the page moves exactly one screen and the penguin makes exactly one whole walk. The
 * page is never left resting between stops: anything that scrolls it some other way (dragging
 * the scrollbar, find-in-page, focus moving into the footer) is settled onto the nearest one.
 */
export function useStopScroll(reducedMotion: boolean) {
  useEffect(() => {
    let index = nearestIndex(window.scrollY, restingPositions());
    let gestureSpent = false;
    let wheelDelta = 0;
    let quietTimer = 0;
    let settleTimer = 0;
    let touchStartY: number | null = null;
    const behavior: ScrollBehavior = reducedMotion ? 'auto' : 'smooth';

    const goTo = (next: number) => {
      const positions = restingPositions();
      const target = Math.max(0, Math.min(positions.length - 1, next));
      index = target;
      if (Math.abs(window.scrollY - positions[target]) > 1) {
        window.scrollTo({ top: positions[target], behavior });
      }
    };
    const step = (direction: 1 | -1) => goTo(index + direction);

    const onWheel = (event: WheelEvent) => {
      // A pinch arrives as ctrl+wheel; the zoom lock owns those.
      if (event.ctrlKey) return;
      event.preventDefault();
      window.clearTimeout(quietTimer);
      quietTimer = window.setTimeout(() => {
        gestureSpent = false;
        wheelDelta = 0;
      }, GESTURE_QUIET_MS);
      if (gestureSpent) return;
      wheelDelta += event.deltaY;
      if (Math.abs(wheelDelta) < WHEEL_THRESHOLD) return;
      gestureSpent = true;
      step(wheelDelta > 0 ? 1 : -1);
    };

    const onTouchStart = (event: TouchEvent) => {
      touchStartY = event.touches[0]?.clientY ?? null;
    };
    const onTouchMove = (event: TouchEvent) => {
      if (touchStartY !== null) event.preventDefault();
    };
    const onTouchEnd = (event: TouchEvent) => {
      const endY = event.changedTouches[0]?.clientY;
      if (touchStartY === null || endY === undefined) return;
      const swipe = touchStartY - endY;
      touchStartY = null;
      if (Math.abs(swipe) >= SWIPE_THRESHOLD) step(swipe > 0 ? 1 : -1);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || isTyping(event.target)) return;
      let handled = true;
      if (FORWARD_KEYS.has(event.key) || (event.key === ' ' && !event.shiftKey)) step(1);
      else if (BACK_KEYS.has(event.key) || (event.key === ' ' && event.shiftKey)) step(-1);
      else if (event.key === 'Home') goTo(0);
      else if (event.key === 'End') goTo(Number.MAX_SAFE_INTEGER);
      else handled = false;
      if (handled) event.preventDefault();
    };

    const onScroll = () => {
      window.clearTimeout(settleTimer);
      settleTimer = window.setTimeout(() => {
        const positions = restingPositions();
        const nearest = nearestIndex(window.scrollY, positions);
        if (Math.abs(window.scrollY - positions[nearest]) > 1) goTo(nearest);
        else index = nearest;
      }, SETTLE_MS);
    };

    window.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd, { passive: true });
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('scroll', onScroll);
      window.clearTimeout(quietTimer);
      window.clearTimeout(settleTimer);
    };
  }, [reducedMotion]);
}
