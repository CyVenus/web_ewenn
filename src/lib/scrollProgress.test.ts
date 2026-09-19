import { describe, expect, it } from 'vitest';
import { nearestIndex, stopProgress } from './scrollProgress';

describe('stopProgress', () => {
  const tops = [0, 800, 1600];

  it('is 0 on the hero and before it', () => {
    expect(stopProgress(0, tops)).toBe(0);
    expect(stopProgress(-40, tops)).toBe(0);
  });

  it('interpolates between screens', () => {
    expect(stopProgress(400, tops)).toBe(0.5);
    expect(stopProgress(1200, tops)).toBe(1.5);
  });

  it('lands exactly on a stop when its screen reaches the top', () => {
    expect(stopProgress(800, tops)).toBe(1);
  });

  it('holds at the last stop past the end, where the footer scrolls in', () => {
    expect(stopProgress(1600, tops)).toBe(2);
    expect(stopProgress(1700, tops)).toBe(2);
  });

  it('uses the measured screen heights, not a fixed one', () => {
    expect(stopProgress(900, [0, 600, 1400])).toBe(1.375);
  });

  it('is 0 when there is nothing to scroll to', () => {
    expect(stopProgress(500, [0])).toBe(0);
    expect(stopProgress(500, [])).toBe(0);
  });
});

describe('nearestIndex', () => {
  it('picks the closest resting position', () => {
    expect(nearestIndex(0, [0, 900, 1800])).toBe(0);
    expect(nearestIndex(500, [0, 900, 1800])).toBe(1);
    expect(nearestIndex(1790, [0, 900, 1800])).toBe(2);
  });

  it('is 0 with nothing to choose from', () => {
    expect(nearestIndex(300, [])).toBe(0);
  });
});
