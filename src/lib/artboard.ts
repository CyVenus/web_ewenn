import { DESKTOP_ARTBOARD, MOBILE_ARTBOARD, PORTRAIT_MAX_ASPECT } from '../config';

export type SceneArtboard = typeof DESKTOP_ARTBOARD | typeof MOBILE_ARTBOARD;

export function pickArtboard(width: number, height: number): SceneArtboard {
  if (!(width > 0) || !(height > 0)) return DESKTOP_ARTBOARD;
  return width / height < PORTRAIT_MAX_ASPECT ? MOBILE_ARTBOARD : DESKTOP_ARTBOARD;
}
