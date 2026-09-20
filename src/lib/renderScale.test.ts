import { describe, expect, it } from 'vitest';
import { MAX_PIXEL_RATIO, renderPixelRatio } from './renderScale';

describe('renderPixelRatio', () => {
  it('leaves an ordinary display alone', () => {
    expect(renderPixelRatio(1)).toBe(1);
    expect(renderPixelRatio(1.25)).toBe(1.25);
  });

  it('caps the retina displays that cost the frames', () => {
    expect(renderPixelRatio(2)).toBe(MAX_PIXEL_RATIO);
    expect(renderPixelRatio(3)).toBe(MAX_PIXEL_RATIO);
  });

  it('never draws below the canvas it is stretched into', () => {
    expect(renderPixelRatio(0.5)).toBe(1);
    expect(renderPixelRatio(0)).toBe(1);
  });

  it('falls back to 1 when the browser reports nothing usable', () => {
    expect(renderPixelRatio(Number.NaN)).toBe(1);
    expect(renderPixelRatio(Number.POSITIVE_INFINITY)).toBe(1);
  });
});
