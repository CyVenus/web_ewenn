import { describe, expect, it } from 'vitest';
import { DESKTOP_ARTBOARD, MOBILE_ARTBOARD, PORTRAIT_MAX_ASPECT } from '../config';
import { pickArtboard } from './artboard';

describe('pickArtboard', () => {
  it('uses the portrait artboard below the aspect threshold', () => {
    expect(pickArtboard(390, 844)).toBe(MOBILE_ARTBOARD);
    expect(pickArtboard(820, 1180)).toBe(MOBILE_ARTBOARD);
  });

  it('uses the desktop artboard at and above it', () => {
    expect(pickArtboard(1440, 900)).toBe(DESKTOP_ARTBOARD);
    expect(pickArtboard(844, 390)).toBe(DESKTOP_ARTBOARD);
    expect(pickArtboard(2560, 1080)).toBe(DESKTOP_ARTBOARD);
  });

  it('treats the threshold itself as desktop', () => {
    expect(pickArtboard(PORTRAIT_MAX_ASPECT * 1000, 1000)).toBe(DESKTOP_ARTBOARD);
  });

  it('falls back to desktop rather than dividing by zero', () => {
    expect(pickArtboard(0, 0)).toBe(DESKTOP_ARTBOARD);
    expect(pickArtboard(100, 0)).toBe(DESKTOP_ARTBOARD);
    expect(pickArtboard(-1, 100)).toBe(DESKTOP_ARTBOARD);
    expect(pickArtboard(Number.NaN, Number.NaN)).toBe(DESKTOP_ARTBOARD);
  });
});
