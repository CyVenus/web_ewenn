import { Fit, Layout, RuntimeLoader, useRive } from '@rive-app/react-webgl2';
import type { Rive } from '@rive-app/webgl2';
import wasmUrl from '@rive-app/webgl2/rive.wasm?url';
import wasmFallbackUrl from '@rive-app/webgl2/rive_fallback.wasm?url';
import { useEffect, useRef, useState } from 'react';
import { RIVE_SRC, RIVE_STATE_MACHINE } from '../config';
import type { SceneArtboard } from '../lib/artboard';
import { afterFrames } from '../lib/frames';
import { PHASE_TIME_VALUE, isLampOnPhase, type Phase } from '../lib/phase';

// Self-host the runtime (the default would fetch it from unpkg) and start compiling it before mount.
RuntimeLoader.setWasmUrl(wasmUrl);
RuntimeLoader.setWasmFallbackUrl(wasmFallbackUrl);
RuntimeLoader.awaitInstance().catch(() => undefined);

/**
 * Long enough for the file's 500 ms phase blends, and for the lamp to finish switching on
 * (about 0.35 s after load in Chrome), while the scene is otherwise paused.
 */
export const PHASE_BLEND_MS = 700;

// Stable instance: a new Layout on every render would be re-applied to the runtime each time.
const SCENE_LAYOUT = new Layout({ fit: Fit.Layout });

export type RiveSceneProps = {
  artboard: SceneArtboard;
  phase: Phase;
  paused: boolean;
  onLoadError: () => void;
};

/** Returns false when the view model didn't bind, which makes every write a silent no-op. */
function writeTime(rive: Rive, phase: Phase): boolean {
  const time = rive.viewModelInstance?.number('time');
  if (!time) return false;
  time.value = PHASE_TIME_VALUE[phase];
  return true;
}

function fireLamp(rive: Rive, trigger: 'lampOn' | 'lampOff') {
  rive.viewModelInstance?.trigger(trigger)?.trigger();
}

export function RiveScene({ artboard, phase, paused, onLoadError }: RiveSceneProps) {
  const [ready, setReady] = useState(false);
  const phaseRef = useRef(phase);
  const pausedRef = useRef(paused);
  const onLoadErrorRef = useRef(onLoadError);
  const appliedPhaseRef = useRef<Phase | null>(null);
  const cancelStartupRef = useRef<() => void>(() => undefined);
  const warnedUnboundRef = useRef(false);

  useEffect(() => {
    phaseRef.current = phase;
    pausedRef.current = paused;
    onLoadErrorRef.current = onLoadError;
  });

  useEffect(() => () => cancelStartupRef.current(), []);

  const { rive, RiveComponent } = useRive({
    src: RIVE_SRC,
    artboard,
    stateMachine: RIVE_STATE_MACHINE,
    autoplay: !paused,
    autoBind: true,
    layout: SCENE_LAYOUT,
    isTouchScrollEnabled: true,
    onRiveReady: (instance: Rive) => {
      // Runs before the first frame, so the correct phase is drawn from frame 1.
      const startPhase = phaseRef.current;
      if (!writeTime(instance, startPhase) && !warnedUnboundRef.current) {
        warnedUnboundRef.current = true;
        console.warn(
          '[ewenn] The Rive view model did not bind (expected PenguinControls/Default with a number "time"); the scene will not follow the clock.',
        );
      }
      appliedPhaseRef.current = startPhase;
      // A paused state machine never advances, so neither the layout reflow nor the lamp would show.
      // Play while the canvas is still hidden; a paused start pauses once that has settled.
      instance.play();
      // Triggers need the state machine to have settled into its entry state first.
      cancelStartupRef.current = afterFrames(2, () => {
        if (isLampOnPhase(startPhase)) fireLamp(instance, 'lampOn');
        if (!pausedRef.current) {
          setReady(true);
          return;
        }
        const timer = window.setTimeout(() => {
          // Each frame advances by the real elapsed time, so waiting for frames too keeps slow devices from pausing early.
          cancelStartupRef.current = afterFrames(2, () => {
            if (pausedRef.current) instance.pause();
            setReady(true);
          });
        }, PHASE_BLEND_MS);
        cancelStartupRef.current = () => window.clearTimeout(timer);
      });
    },
    onLoadError: () => onLoadErrorRef.current(),
  });

  // Declared before the phase effect: when `ready` flips on a paused start, this pause must come first,
  // so a phase change made during startup still gets its play → PHASE_BLEND_MS → pause blend below.
  useEffect(() => {
    if (!rive || !ready) return;
    if (paused) rive.pause();
    else rive.play();
  }, [rive, ready, paused]);

  useEffect(() => {
    if (!rive || !ready) return;
    const previous = appliedPhaseRef.current;
    if (previous === null || previous === phase) return;
    appliedPhaseRef.current = phase;
    writeTime(rive, phase);
    // Both triggers are idempotent in the file, so reassert the lamp on every phase change (spec §6).
    fireLamp(rive, isLampOnPhase(phase) ? 'lampOn' : 'lampOff');
    if (!pausedRef.current) return;
    rive.play();
    const timer = window.setTimeout(() => {
      if (pausedRef.current) rive.pause();
    }, PHASE_BLEND_MS);
    return () => window.clearTimeout(timer);
  }, [rive, ready, phase]);

  return (
    <div className={ready ? 'scene is-ready' : 'scene'} aria-hidden="true">
      <RiveComponent className="scene__canvas" />
    </div>
  );
}
