import type { JSX, PointerEvent as ReactPointerEvent } from 'react';
import { useEffect, useRef, useState } from 'react';

import type { MarbleGameConfig } from './MarbleSetup';
import { Box2dPhysics } from './engine/Box2dPhysics';
import { Camera, type CameraView } from './engine/Camera';
import { CanvasRenderer, type CanvasRenderTarget } from './engine/CanvasRenderer';
import { NOTME_COURSE } from './engine/course';
import { RouletteEngine, type RaceSnapshot } from './engine/RouletteEngine';
import './marble.css';

type RaceEngine = Pick<
  RouletteEngine,
  'init' | 'advance' | 'snapshot' | 'setFastForward' | 'destroy'
>;

type RaceCamera = {
  update(snapshot: RaceSnapshot, course: typeof NOTME_COURSE): CameraView;
};

type RaceRenderer = {
  render(target: CanvasRenderTarget, snapshot: RaceSnapshot, cameraView: CameraView): void;
};

type MarbleRaceRuntime = {
  engine: RaceEngine;
  camera: RaceCamera;
  renderer: RaceRenderer;
};

export type MarbleRaceRuntimeFactory = (config: MarbleGameConfig) => MarbleRaceRuntime;

type MarbleRaceProps = {
  config: MarbleGameConfig;
  onFinish: (snapshot: RaceSnapshot) => void;
  onAbort: () => void;
  onError: (error: unknown) => void;
  runtimeFactory?: MarbleRaceRuntimeFactory;
};

const createDefaultRuntime: MarbleRaceRuntimeFactory = (config) => {
  const physics = new Box2dPhysics();
  return {
    engine: new RouletteEngine({
      physics,
      marbles: config.shuffledMarbles,
      winnerMode: config.winnerMode,
      skillsEnabled: config.skillsEnabled,
      random: Math.random,
    }),
    camera: new Camera(),
    renderer: new CanvasRenderer(NOTME_COURSE),
  };
};

export function MarbleRace({
  config,
  onFinish,
  onAbort,
  onError,
  runtimeFactory = createDefaultRuntime,
}: MarbleRaceProps): JSX.Element {
  const mainCanvasRef = useRef<HTMLCanvasElement>(null);
  const minimapCanvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<RaceEngine | null>(null);
  const activePointerRef = useRef<number | null>(null);
  const onFinishRef = useRef(onFinish);
  const onErrorRef = useRef(onError);
  const [loading, setLoading] = useState(true);
  const [snapshot, setSnapshot] = useState<RaceSnapshot | null>(null);

  onFinishRef.current = onFinish;
  onErrorRef.current = onError;

  useEffect(() => {
    let runtime: MarbleRaceRuntime | null = null;
    let active = true;
    let finished = false;
    let errorReported = false;
    let frameId: number | null = null;
    let lastTimestamp: number | null = null;

    setLoading(true);
    setSnapshot(null);

    const reportError = (error: unknown) => {
      if (!active || errorReported || finished) return;
      errorReported = true;
      active = false;
      if (frameId !== null) cancelAnimationFrame(frameId);
      if (activePointerRef.current !== null) runtime?.engine.setFastForward(false);
      activePointerRef.current = null;
      if (engineRef.current === runtime?.engine) engineRef.current = null;
      onErrorRef.current(error);
    };

    try {
      runtime = runtimeFactory(config);
      engineRef.current = runtime.engine;
      const main = mainCanvasRef.current?.getContext('2d');
      const minimap = minimapCanvasRef.current?.getContext('2d');
      if (!main || !minimap) throw new Error('룰렛 Canvas를 준비하지 못했습니다.');
      const target = { main, minimap };

      const drawFrame = (timestamp: number) => {
        if (!active || !runtime) return;

        try {
          const deltaMs = lastTimestamp === null ? 0 : Math.max(0, timestamp - lastTimestamp);
          lastTimestamp = timestamp;
          runtime.engine.advance(deltaMs);
          const nextSnapshot = runtime.engine.snapshot();
          const view = runtime.camera.update(nextSnapshot, NOTME_COURSE);
          runtime.renderer.render(target, nextSnapshot, view);
          setSnapshot(nextSnapshot);

          if (nextSnapshot.winner) {
            finished = true;
            active = false;
            if (activePointerRef.current !== null) {
              activePointerRef.current = null;
              runtime.engine.setFastForward(false);
            }
            onFinishRef.current(nextSnapshot);
            return;
          }

          frameId = requestAnimationFrame(drawFrame);
        } catch (error) {
          reportError(error);
        }
      };

      void runtime.engine.init().then((initialized) => {
        if (!active || !initialized) return;
        setSnapshot(runtime?.engine.snapshot() ?? null);
        setLoading(false);
        frameId = requestAnimationFrame(drawFrame);
      }).catch(reportError);
    } catch (error) {
      reportError(error);
    }

    const stopFastForward = () => {
      if (activePointerRef.current === null) return;
      activePointerRef.current = null;
      runtime?.engine.setFastForward(false);
    };
    const handleBlur = () => stopFastForward();
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') stopFastForward();
    };
    window.addEventListener('blur', handleBlur);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      active = false;
      window.removeEventListener('blur', handleBlur);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (frameId !== null) cancelAnimationFrame(frameId);
      activePointerRef.current = null;
      if (runtime) {
        try {
          runtime.engine.setFastForward(false);
        } finally {
          runtime.engine.destroy();
        }
      }
      if (engineRef.current === runtime?.engine) engineRef.current = null;
    };
  }, [config, runtimeFactory]);

  function startFastForward(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (activePointerRef.current !== null || !engineRef.current) return;
    activePointerRef.current = event.pointerId;
    event.currentTarget.setPointerCapture(event.pointerId);
    engineRef.current.setFastForward(true);
  }

  function stopFastForward(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (activePointerRef.current === null || activePointerRef.current !== event.pointerId) return;
    activePointerRef.current = null;
    engineRef.current?.setFastForward(false);
  }

  const rankings = snapshot
    ? [
      ...snapshot.finishOrder.map((marble) => ({ ...marble, label: `${marble.rank}위` })),
      ...snapshot.active
        .slice()
        .sort((left, right) => right.body.y - left.body.y)
        .map((marble, index) => ({
          ...marble,
          rank: snapshot.finishOrder.length + index + 1,
          label: `${snapshot.finishOrder.length + index + 1}위 예상`,
        })),
    ]
    : [];
  const liveRanking = rankings.slice(0, 3).map(({ label, name }) => `${label} ${name}`).join(', ');

  return (
    <section className="marble-race" aria-busy={loading}>
      <div className="marble-race__stage">
        <canvas
          ref={mainCanvasRef}
          className="marble-race__canvas"
          data-testid="marble-canvas"
          aria-label="마블 레이스 코스"
          onPointerDown={startFastForward}
          onPointerUp={stopFastForward}
          onPointerCancel={stopFastForward}
          onLostPointerCapture={stopFastForward}
        />
        <canvas
          ref={minimapCanvasRef}
          className="marble-race__minimap"
          data-testid="marble-minimap"
          aria-label="전체 코스 미니맵"
        />
        {loading && <p className="marble-race__loading" role="status">룰렛을 준비하고 있어요</p>}
      </div>

      <p className="marble-race__speed-guide">누르고 있는 동안 4배속</p>
      <p className="marble-race__live" aria-live="polite" aria-atomic="true">{liveRanking}</p>

      <section className="marble-ranking">
        <h2>진행 순위</h2>
        <ol aria-label="진행 순위">
          {rankings.slice(0, 8).map(({ id, label, name }) => (
            <li key={id}>
              <span>{label}</span>
              <strong>{name}</strong>
            </li>
          ))}
        </ol>
      </section>

      <button
        className="marble-race__abort"
        type="button"
        onClick={() => {
          if (activePointerRef.current !== null) {
            activePointerRef.current = null;
            engineRef.current?.setFastForward(false);
          }
          onAbort();
        }}
      >
        레이스 중단
      </button>
    </section>
  );
}
