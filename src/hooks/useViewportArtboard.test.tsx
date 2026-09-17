import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DESKTOP_ARTBOARD, MOBILE_ARTBOARD } from '../config';
import { RESIZE_DEBOUNCE_MS, useViewportArtboard } from './useViewportArtboard';

function resizeTo(width: number, height: number) {
  Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: width });
  Object.defineProperty(window, 'innerHeight', { writable: true, configurable: true, value: height });
}

beforeEach(() => {
  vi.useFakeTimers();
  resizeTo(1440, 900);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useViewportArtboard', () => {
  it('picks the artboard from the viewport it mounts into', () => {
    resizeTo(390, 844);
    const { result } = renderHook(() => useViewportArtboard());
    expect(result.current).toBe(MOBILE_ARTBOARD);
  });

  it('switches artboard when the viewport crosses the aspect threshold', () => {
    const { result } = renderHook(() => useViewportArtboard());
    expect(result.current).toBe(DESKTOP_ARTBOARD);

    act(() => {
      resizeTo(390, 844);
      window.dispatchEvent(new Event('resize'));
      vi.advanceTimersByTime(RESIZE_DEBOUNCE_MS);
    });
    expect(result.current).toBe(MOBILE_ARTBOARD);
  });

  /**
   * Switching artboard remounts the Rive runtime, so an undebounced resize would tear the scene
   * down and rebuild it on every frame of a window drag.
   */
  it('does not switch before the debounce elapses', () => {
    const { result } = renderHook(() => useViewportArtboard());

    act(() => {
      resizeTo(390, 844);
      window.dispatchEvent(new Event('resize'));
      vi.advanceTimersByTime(RESIZE_DEBOUNCE_MS - 10);
    });
    expect(result.current).toBe(DESKTOP_ARTBOARD);
  });

  it('collapses a burst of resizes into a single switch', () => {
    const { result } = renderHook(() => useViewportArtboard());

    act(() => {
      for (let i = 0; i < 20; i += 1) {
        resizeTo(1000 - i * 30, 844);
        window.dispatchEvent(new Event('resize'));
        vi.advanceTimersByTime(10);
      }
      resizeTo(390, 844);
      window.dispatchEvent(new Event('resize'));
      vi.advanceTimersByTime(RESIZE_DEBOUNCE_MS);
    });
    expect(result.current).toBe(MOBILE_ARTBOARD);
  });

  it('detaches its listener on unmount', () => {
    const remove = vi.spyOn(window, 'removeEventListener');
    const { unmount } = renderHook(() => useViewportArtboard());
    unmount();
    expect(remove).toHaveBeenCalledWith('resize', expect.any(Function));
  });
});
