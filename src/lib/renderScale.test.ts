import { describe, expect, it } from 'vitest';
import {
  MAX_PIXEL_RATIO,
  MIN_PIXEL_RATIO,
  SLOW_FRAME_MS,
  medianFrameMs,
  nextPixelRatio,
  renderPixelRatio,
} from './renderScale';

describe('nextPixelRatio', () => {
  it('leaves a smooth scene alone', () => {
    expect(nextPixelRatio(1.5, 14)).toBe(1.5);
    expect(nextPixelRatio(1.5, SLOW_FRAME_MS)).toBe(1.5);
  });

  it('counts one missed vsync on a 144Hz screen as smooth', () => {
    // 3 refreshes of 6.94ms: 48fps, which nobody reads as stutter.
    expect(nextPixelRatio(1.5, 20.8)).toBe(1.5);
  });

  it('steps down while frames are slow', () => {
    expect(nextPixelRatio(1.5, 27.8)).toBe(1.25);
    expect(nextPixelRatio(1.25, 33.3)).toBe(1);
  });

  it('never goes below the canvas size', () => {
    expect(nextPixelRatio(MIN_PIXEL_RATIO, 60)).toBe(MIN_PIXEL_RATIO);
    expect(nextPixelRatio(1.1, 60)).toBe(MIN_PIXEL_RATIO);
  });

  it('ignores a measurement that is not a number', () => {
    expect(nextPixelRatio(1.5, Number.NaN)).toBe(1.5);
  });
});

describe('medianFrameMs', () => {
  it('skips the startup frames and takes the middle', () => {
    expect(medianFrameMs([90, 80, 70, 60, 50, 14, 15, 16, 30, 13])).toBe(15);
  });

  it('is zero when there is nothing to measure', () => {
    expect(medianFrameMs([10, 10])).toBe(0);
  });
});

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
