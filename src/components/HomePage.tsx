import { useCallback, useEffect, useRef, useState } from 'react';
import { STOPS } from '../config';
import { usePhase } from '../hooks/usePhase';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { useStopScroll } from '../hooks/useStopScroll';
import { useViewportArtboard } from '../hooks/useViewportArtboard';
import { useZoomLock } from '../hooks/useZoomLock';
import { copyOpacity } from '../lib/copyReveal';
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
  /** Copy blocks in screen order: the hero, then one per stop. Filled by the callback refs below. */
  const copyRefs = useRef<(HTMLElement | null)[]>([]);
  const walkDrivenRef = useRef(false);
  const [walkDriven, setWalkDriven] = useState(false);
  const phase = usePhase();
  const artboard = useViewportArtboard();
  const reducedMotion = useReducedMotion();
  useStopScroll(reducedMotion);
  // Probed once, at mount: the answer cannot change for the life of the document.
  const [webGL2Available] = useState(supportsWebGL2);
  const [sceneFailed, setSceneFailed] = useState(!webGL2Available);
  const onFailed = useCallback(() => setSceneFailed(true), []);

  /*
   * Fade each block by where the penguin is, not by where the page has scrolled to. The scroll
   * jumps a whole screen the moment the gesture lands while the walk takes a couple of seconds,
   * so a scroll-keyed fade hands the reader the next chapter's words over the previous chapter's
   * scenery. Written straight to the node: this runs every animation frame of the walk, and
   * routing it through state would re-render the page each time.
   */
  const onWalk = useCallback((shown: number) => {
    // Once, on the first frame the scene reports: this runs at 60fps and the class never changes back.
    if (!walkDrivenRef.current) {
      walkDrivenRef.current = true;
      setWalkDriven(true);
    }
    copyRefs.current.forEach((node, index) => {
      if (!node) return;
      const opacity = copyOpacity(shown, index);
      node.style.opacity = String(opacity);
      // Pinned, the blocks sit on top of one another, so an invisible hero would still be catching
      // the taps meant for the stop underneath it — the App Store badge most of all.
      node.style.pointerEvents = opacity === 0 ? 'none' : '';
    });
  }, []);

  useEffect(() => {
    if (!webGL2Available) {
      console.warn('[ewenn] WebGL2 is unavailable; showing the static sky instead.');
    }
  }, [webGL2Available]);

  // A scene that dies after it has walked would leave its last opacities painted on, and with no
  // more frames coming they would never lift. Hand the fade back to the stylesheet.
  useEffect(() => {
    if (!sceneFailed) return;
    copyRefs.current.forEach((node) => {
      if (!node) return;
      node.style.removeProperty('opacity');
      node.style.removeProperty('pointer-events');
    });
  }, [sceneFailed]);

  return (
    <div
      className={`page page--home${sceneFailed ? ' page--scene-failed' : ''}${
        walkDriven && !sceneFailed ? ' page--walk-copy' : ''
      }`}
    >
      {!sceneFailed && (
        <RiveStage
          artboard={artboard}
          phase={phase}
          paused={reducedMotion}
          onFailed={onFailed}
          readProgress={readProgress}
          onWalk={onWalk}
        />
      )}
      <div className="overlay">
        <SiteHeader />
        <main className="overlay__main">
          <div className="screen screen--hero" data-screen="hero">
            {/* The fade and the pinning both belong on this wrapper rather than on the screen:
                a pinned screen would leave the flow and take a third of the scroll range with it. */}
            <div
              className="screen__pin"
              ref={(node) => {
                copyRefs.current[0] = node;
              }}
            >
              <Hero />
            </div>
          </div>
          {STOPS.map((stop, index) => (
            <section
              key={stop.id}
              className="screen screen--stop"
              data-screen={stop.id}
              aria-labelledby={`stop-${stop.id}-title`}
            >
              <div
                className="stop__copy"
                ref={(node) => {
                  copyRefs.current[index + 1] = node;
                }}
              >
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
