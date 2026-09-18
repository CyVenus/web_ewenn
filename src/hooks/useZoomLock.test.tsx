import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useZoomLock } from './useZoomLock';

const ctrlWheelIsSwallowed = () => {
  const event = new WheelEvent('wheel', { ctrlKey: true, cancelable: true });
  window.dispatchEvent(event);
  return event.defaultPrevented;
};

describe('useZoomLock', () => {
  it('locks the page while it is mounted', () => {
    expect(ctrlWheelIsSwallowed()).toBe(false);
    const { unmount } = renderHook(() => useZoomLock());
    expect(ctrlWheelIsSwallowed()).toBe(true);
    unmount();
  });

  /* StrictMode mounts, tears down and mounts again, so the teardown has to be complete. */
  it('gives the page back on unmount', () => {
    const { unmount } = renderHook(() => useZoomLock());
    unmount();
    expect(ctrlWheelIsSwallowed()).toBe(false);
  });

  it('survives being mounted twice over', () => {
    const first = renderHook(() => useZoomLock());
    const second = renderHook(() => useZoomLock());
    first.unmount();
    // The second lock is still installed, so the page stays locked.
    expect(ctrlWheelIsSwallowed()).toBe(true);
    second.unmount();
    expect(ctrlWheelIsSwallowed()).toBe(false);
  });
});
