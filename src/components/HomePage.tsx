import { useCallback, useEffect, useState } from 'react';
import { STOPS } from '../config';
import { usePhase } from '../hooks/usePhase';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { useStopScroll } from '../hooks/useStopScroll';
import { useViewportArtboard } from '../hooks/useViewportArtboard';
import { useZoomLock } from '../hooks/useZoomLock';
import { stopProgress } from '../lib/scrollProgress';
import { supportsWebGL2 } from '../lib/webgl';
import { Hero } from './Hero';
import { RiveStage } from './RiveStage';
import { SiteFooter } from './SiteFooter';
import { SiteHeader } from './SiteHeader';

/** Measured on every read: screens reflow with the viewport and a cached offset goes stale. */
function readProgress(): number {
  const tops = Array.from(document.querySelectorAll<HTMLElement>('[data-screen]'), (screen) => {
    return screen.getBoundingClientRect().top + window.scrollY;
  });
  return stopProgress(window.scrollY, tops);
}

export function HomePage() {
  useZoomLock();
  const phase = usePhase();
  const artboard = useViewportArtboard();
  const reducedMotion = useReducedMotion();
  useStopScroll(reducedMotion);
  // Probed once, at mount: the answer cannot change for the life of the document.
  const [webGL2Available] = useState(supportsWebGL2);
  const [sceneFailed, setSceneFailed] = useState(!webGL2Available);
  const onFailed = useCallback(() => setSceneFailed(true), []);

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
          onFailed={onFailed}
          readProgress={readProgress}
        />
      )}
      <div className="overlay">
        <SiteHeader />
        <main className="overlay__main">
          <div className="screen screen--hero" data-screen="hero">
            <Hero />
          </div>
          {STOPS.map((stop) => (
            <section
              key={stop.id}
              className="screen screen--stop"
              data-screen={stop.id}
              aria-labelledby={`stop-${stop.id}-title`}
            >
              <div className="stop__copy">
                <h2 id={`stop-${stop.id}-title`} className="stop__title">
                  {stop.title}
                </h2>
                <p className="stop__body">{stop.body}</p>
              </div>
            </section>
          ))}
        </main>
        <SiteFooter />
      </div>
    </div>
  );
}
