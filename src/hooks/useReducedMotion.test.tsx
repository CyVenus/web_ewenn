import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useReducedMotion } from './useReducedMotion';

function mockMatchMedia(matches: boolean) {
  const listeners = new Set<() => void>();
  const mq = {
    matches,
    media: '(prefers-reduced-motion: reduce)',
    addEventListener: (_: string, fn: () => void) => listeners.add(fn),
    removeEventListener: (_: string, fn: () => void) => listeners.delete(fn),
  };
  vi.stubGlobal('matchMedia', vi.fn(() => mq));
  return { mq, listeners };
}

describe('useReducedMotion', () => {
  it('is false when the visitor has expressed no preference', () => {
    mockMatchMedia(false);
    expect(renderHook(() => useReducedMotion()).result.current).toBe(false);
  });

  it('is true when the visitor asked for reduced motion', () => {
    mockMatchMedia(true);
    expect(renderHook(() => useReducedMotion()).result.current).toBe(true);
  });

  it('queries the prefers-reduced-motion media feature', () => {
    mockMatchMedia(false);
    renderHook(() => useReducedMotion());
    expect(window.matchMedia).toHaveBeenCalledWith('(prefers-reduced-motion: reduce)');
  });

  it('unsubscribes on unmount', () => {
    const { listeners } = mockMatchMedia(false);
    const { unmount } = renderHook(() => useReducedMotion());
    expect(listeners.size).toBe(1);
    unmount();
    expect(listeners.size).toBe(0);
  });
});
