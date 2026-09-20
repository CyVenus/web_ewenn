import { Fit, Layout, RuntimeLoader, useRive } from '@rive-app/react-webgl2';
import type { Rive } from '@rive-app/webgl2';
import wasmUrl from '@rive-app/webgl2/rive.wasm?url';
import wasmFallbackUrl from '@rive-app/webgl2/rive_fallback.wasm?url';
import { useEffect, useRef, useState } from 'react';
import { RIVE_SRC, RIVE_STATE_MACHINE } from '../config';
import type { SceneArtboard } from '../lib/artboard';
import { afterFrames } from '../lib/frames';
import { greet, isAtGreetStop } from '../lib/greeting';
import { PHASE_TIME_VALUE, isLampOnPhase, type Phase } from '../lib/phase';
import { INITIAL_WALKER, isSettled, stepWalker, type WalkerState } from '../lib/walker';

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
  /** Where the reader is along the world, in stops. Omitted, the world stays on the hero. */
  readProgress?: () => number;
  /** Where the penguin has actually walked to, in stops, reported on every frame it moves. */
  onWalk?: (shown: number) => void;
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

export function RiveScene({ artboard, phase, paused, onLoadError, readProgress, onWalk }: RiveSceneProps) {
  const [ready, setReady] = useState(false);
  const phaseRef = useRef(phase);
  const pausedRef = useRef(paused);
  const onLoadErrorRef = useRef(onLoadError);
  const onWalkRef = useRef(onWalk);
  const appliedPhaseRef = useRef<Phase | null>(null);
  const cancelStartupRef = useRef<() => void>(() => undefined);
  const warnedUnboundRef = useRef(false);

  useEffect(() => {
    phaseRef.current = phase;
    pausedRef.current = paused;
    onLoadErrorRef.current = onLoadError;
    onWalkRef.current = onWalk;
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

  // The penguin walks the reader through the world: each frame the world advances toward the
  // scroll position at walking pace (lib/walker.ts) and the pose and facing follow it. Under
  // reduced motion there is no walk: the world snaps to the nearest stop with the penguin facing
  // the viewer, and the paused machine is run for two frames so the snap actually draws.
  useEffect(() => {
    if (!rive || !ready || !readProgress) return;
    const viewModel = rive.viewModelInstance;
    const scroll = viewModel?.number('scroll');
    if (!scroll) {
      console.warn('[ewenn] The Rive file has no "scroll" number; the world will not follow the page.');
      return;
    }
    const pose = viewModel?.number('walkPose');
    const facing = viewModel?.number('walkFacing');
    // The penguins greet each other when the walker reaches them, once per arrival: `write` runs
    // on every frame the reader stands there, and a flipper raised every frame is a seizure, not
    // a greeting. Skipped under reduced motion, where the machine is paused two frames at a time
    // and the wave would freeze half-raised.
    let greeted = false;
    let cancelGreeting: () => void = () => undefined;
    const fireGreeting = (trigger: string) => viewModel?.trigger(trigger)?.trigger();

    // Arriving mid-page (a reload, a fragment link) puts the world there without a walk.
    const start = pausedRef.current ? Math.round(readProgress()) : readProgress();
    let state: WalkerState = stepWalker({ ...INITIAL_WALKER, shown: start }, start, 0, 0);
    let frame = 0;
    let last = 0;
    let cancelRedraw: () => void = () => undefined;

    const write = () => {
      scroll.value = state.shown;
      if (pose) pose.value = state.pose;
      if (facing) facing.value = state.facing;
      onWalkRef.current?.(state.shown);
      if (!pausedRef.current && isAtGreetStop(state.shown)) {
        if (!greeted) {
          greeted = true;
          cancelGreeting = greet(fireGreeting);
        }
      } else if (greeted) {
        greeted = false;
        cancelGreeting();
      }
      if (!pausedRef.current) return;
      cancelRedraw();
      rive.play();
      cancelRedraw = afterFrames(2, () => {
        if (pausedRef.current) rive.pause();
      });
    };

    const tick = () => {
      frame = 0;
      const target = readProgress();
      if (pausedRef.current) {
        const stop = Math.round(target);
        if (stop === state.shown) return;
        state = { ...INITIAL_WALKER, shown: stop };
        write();
        return;
      }
      const now = performance.now();
      // Capped so a tab coming back from the background does not teleport the world.
      const dt = last ? Math.min((now - last) / 1000, 0.25) : 1 / 60;
      last = now;
      state = stepWalker(state, target, now, dt);
      write();
      if (isSettled(state, target)) {
        last = 0;
        return;
      }
      frame = requestAnimationFrame(tick);
    };
    const wake = () => {
      if (!frame) frame = requestAnimationFrame(tick);
    };

    write();
    window.addEventListener('scroll', wake, { passive: true });
    window.addEventListener('resize', wake);
    return () => {
      window.removeEventListener('scroll', wake);
      window.removeEventListener('resize', wake);
      cancelAnimationFrame(frame);
      cancelRedraw();
      cancelGreeting();
    };
  }, [rive, ready, readProgress]);

  return (
    <div className={ready ? 'scene is-ready' : 'scene'} aria-hidden="true">
      <RiveComponent className="scene__canvas" />
    </div>
  );
}
