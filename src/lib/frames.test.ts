import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { afterFrames } from './frames';

/** A controllable rAF: frames only advance when the test says so. */
let queue: (() => void)[] = [];

beforeEach(() => {
  queue = [];
  vi.stubGlobal('requestAnimationFrame', (cb: () => void) => {
    queue.push(cb);
    return queue.length;
  });
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const tick = () => {
  const next = queue.shift();
  next?.();
};

describe('afterFrames', () => {
  it('waits the requested number of frames before firing', () => {
    const spy = vi.fn();
    afterFrames(2, spy);
    expect(spy).not.toHaveBeenCalled();
    tick();
    expect(spy).not.toHaveBeenCalled();
    tick();
    expect(spy).toHaveBeenCalledOnce();
  });

  it('fires on the first frame when asked for one', () => {
    const spy = vi.fn();
    afterFrames(1, spy);
    tick();
    expect(spy).toHaveBeenCalledOnce();
  });

  it('returns a cancel function that stops the pending frame', () => {
    const spy = vi.fn();
    const cancel = afterFrames(2, spy);
    cancel();
    expect(cancelAnimationFrame).toHaveBeenCalled();
  });

  it('never fires more than once', () => {
    const spy = vi.fn();
    afterFrames(1, spy);
    tick();
    tick();
    expect(spy).toHaveBeenCalledOnce();
  });
});
