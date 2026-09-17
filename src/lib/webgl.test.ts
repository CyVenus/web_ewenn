import { afterEach, describe, expect, it, vi } from 'vitest';
import { supportsWebGL2 } from './webgl';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('supportsWebGL2', () => {
  it('is true when a webgl2 context can be created', () => {
    const loseContext = vi.fn();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      getExtension: () => ({ loseContext }),
    } as unknown as RenderingContext);
    expect(supportsWebGL2()).toBe(true);
  });

  /** Browsers cap live WebGL contexts, so the probe must not hold one open. */
  it('releases the probe context instead of waiting for garbage collection', () => {
    const loseContext = vi.fn();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      getExtension: () => ({ loseContext }),
    } as unknown as RenderingContext);
    supportsWebGL2();
    expect(loseContext).toHaveBeenCalledOnce();
  });

  it('is false when the context is unavailable', () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    expect(supportsWebGL2()).toBe(false);
  });

  it('is false rather than throwing when getContext itself throws', () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(supportsWebGL2()).toBe(false);
  });
});
