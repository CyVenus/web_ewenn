import { useEffect, useState } from 'react';
import { usePhase } from '../hooks/usePhase';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { useViewportArtboard } from '../hooks/useViewportArtboard';
import { supportsWebGL2 } from '../lib/webgl';
import { Hero } from './Hero';
import { RiveStage } from './RiveStage';
import { SiteFooter } from './SiteFooter';
import { SiteHeader } from './SiteHeader';

export function HomePage() {
  const phase = usePhase();
  const artboard = useViewportArtboard();
  const reducedMotion = useReducedMotion();
  // Probed once, at mount: the answer cannot change for the life of the document.
  const [webGL2Available] = useState(supportsWebGL2);
  const [sceneFailed, setSceneFailed] = useState(!webGL2Available);

  useEffect(() => {
    if (!webGL2Available) {
      console.warn('[ewenn] WebGL2 is unavailable; showing the static sky instead.');
    }
  }, [webGL2Available]);

  return (
    <div className={sceneFailed ? 'page page--home page--scene-failed' : 'page page--home'}>
      {!sceneFailed && (
        <RiveStage
          artboard={artboard}
          phase={phase}
          paused={reducedMotion}
          onFailed={() => setSceneFailed(true)}
        />
      )}
      <div className="overlay">
        <SiteHeader />
        <main className="overlay__main">
          <Hero />
        </main>
        <SiteFooter />
      </div>
    </div>
  );
}
