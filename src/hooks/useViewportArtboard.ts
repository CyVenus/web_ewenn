import { useEffect, useState } from 'react';
import { pickArtboard, type SceneArtboard } from '../lib/artboard';

export const RESIZE_DEBOUNCE_MS = 150;

const currentArtboard = () => pickArtboard(window.innerWidth, window.innerHeight);

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
