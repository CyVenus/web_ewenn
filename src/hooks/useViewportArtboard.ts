import { useEffect, useState } from 'react';
import { pickArtboard, type SceneArtboard } from '../lib/artboard';
import { designViewport } from '../lib/zoomLock';

export const RESIZE_DEBOUNCE_MS = 150;

/*
 * The design viewport, not the real one. Under an active zoom lock they differ by the applied
 * scale, and a 1440-wide layout counter-scaled from a 720px viewport still wants the desktop
 * artboard — picking the phone one would reflow the scene the lock exists to hold still.
 */
const currentArtboard = () => {
  const { width, height } = designViewport(window);
  return pickArtboard(width, height);
};

export function useViewportArtboard(): SceneArtboard {
  const [artboard, setArtboard] = useState<SceneArtboard>(currentArtboard);

  useEffect(() => {
    let timer: number | undefined;
    const onResize = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setArtboard(currentArtboard()), RESIZE_DEBOUNCE_MS);
    };
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      window.clearTimeout(timer);
    };
  }, []);

  return artboard;
}
