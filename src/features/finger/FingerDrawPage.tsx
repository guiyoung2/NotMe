import type { CSSProperties, JSX, PointerEvent as ReactPointerEvent } from 'react';
import { useEffect, useReducer, useState } from 'react';

import { GameShell } from '../../app/GameShell';
import {
  COUNTDOWN_MS,
  createFingerDrawGame,
  fingerDrawReducer,
  pickFingerId,
} from './fingerDrawMachine';
import './fingerDraw.css';

function clampPercentage(value: number): number {
  return Math.min(100, Math.max(0, value));
}

function pointerPosition(event: ReactPointerEvent<HTMLDivElement>) {
  const bounds = event.currentTarget.getBoundingClientRect();
  const width = bounds.width || 1;
  const height = bounds.height || 1;

  return {
    x: clampPercentage((event.clientX - bounds.left) / width * 100),
    y: clampPercentage((event.clientY - bounds.top) / height * 100),
  };
}

function randomFingerId(ids: number[]): number {
  const values = new Uint32Array(1);
  crypto.getRandomValues(values);
  return pickFingerId(ids, () => values[0]! / 4_294_967_296);
}

export function FingerDrawPage(): JSX.Element {
  const [state, dispatch] = useReducer(fingerDrawReducer, undefined, createFingerDrawGame);
  const [clock, setClock] = useState(() => performance.now());
  const remainingSeconds = state.phase === 'countdown' && state.countdownStartedAt !== null
    ? Math.max(1, Math.ceil((state.countdownStartedAt + COUNTDOWN_MS - clock) / 1_000))
    : 3;

  useEffect(() => {
    if (state.phase !== 'countdown') return;

    const ids = state.fingers.map(({ id }) => id);
    const version = state.countdownVersion;
    const timeoutId = window.setTimeout(() => {
      dispatch({ type: 'resolve', version, selectedId: randomFingerId(ids) });
    }, COUNTDOWN_MS);

    return () => window.clearTimeout(timeoutId);
  }, [state.countdownVersion, state.phase]);

  useEffect(() => {
    if (state.phase !== 'countdown') return;

    setClock(performance.now());
    const intervalId = window.setInterval(() => setClock(performance.now()), 100);
    return () => window.clearInterval(intervalId);
  }, [state.countdownVersion, state.phase]);

  useEffect(() => {
    if (state.phase !== 'countdown') return;

    const resetWhenHidden = () => {
      if (document.visibilityState === 'hidden') dispatch({ type: 'reset' });
    };
    document.addEventListener('visibilitychange', resetWhenHidden);
    return () => document.removeEventListener('visibilitychange', resetWhenHidden);
  }, [state.phase]);

  function updateClockAndDispatch(action: Parameters<typeof fingerDrawReducer>[1]) {
    const now = performance.now();
    setClock(now);
    dispatch(action.type === 'touch-start' || action.type === 'touch-end' ? { ...action, now } : action);
  }

  function handlePointerStart(event: ReactPointerEvent<HTMLDivElement>) {
    event.preventDefault();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    const { x, y } = pointerPosition(event);
    updateClockAndDispatch({ type: 'touch-start', id: event.pointerId, x, y, now: 0 });
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const { x, y } = pointerPosition(event);
    dispatch({ type: 'touch-move', id: event.pointerId, x, y });
  }

  function handlePointerEnd(event: ReactPointerEvent<HTMLDivElement>) {
    updateClockAndDispatch({ type: 'touch-end', id: event.pointerId, now: 0 });
  }

  const isChangedCountdown = state.phase === 'countdown' && state.countdownReason === 'changed';

  return (
    <GameShell title="손가락 추첨" dirty={false} onReset={() => dispatch({ type: 'reset' })} showReset={false}>
      <section className="finger-draw-page">
        <div
          className="finger-draw-field"
          data-testid="finger-touch-field"
          aria-label="손가락 추첨 터치 영역"
          onPointerDown={handlePointerStart}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerEnd}
          onPointerCancel={handlePointerEnd}
          onLostPointerCapture={handlePointerEnd}
        >
          {state.fingers.map((finger) => (
            <span
              key={finger.id}
              className={`finger-draw-finger${state.phase === 'countdown' ? ' finger-draw-finger--counting' : ''}${state.selectedId === finger.id ? ' finger-draw-finger--selected' : ''}${state.phase === 'result' && state.selectedId !== finger.id ? ' finger-draw-finger--dimmed' : ''}`}
              style={{ left: `${finger.x}%`, top: `${finger.y}%`, '--finger-color': finger.color } as CSSProperties}
              aria-hidden="true"
            />
          ))}

          {state.phase === 'waiting' ? (
            <div className="finger-draw-copy">
              <h2>화면에 손가락을 올려주세요</h2>
              <p>2명 이상이면 자동으로 시작해요</p>
            </div>
          ) : state.phase === 'countdown' ? (
            <div className="finger-draw-copy" aria-live="polite">
              <output className="finger-draw-count" aria-label="남은 시간">{remainingSeconds}</output>
              <h2>{isChangedCountdown ? '다시 시작해요' : '그대로 유지하세요'}</h2>
              {isChangedCountdown && <p>손가락을 유지하세요</p>}
            </div>
          ) : (
            <div className="finger-draw-copy" aria-live="polite">
              <h2>선택됐어요!</h2>
            </div>
          )}

          {state.phase === 'result' && (
            <button className="button--accent finger-draw-replay" type="button" onClick={() => dispatch({ type: 'reset' })}>
              다시 하기
            </button>
          )}
        </div>
      </section>
    </GameShell>
  );
}
