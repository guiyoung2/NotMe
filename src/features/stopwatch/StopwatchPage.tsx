import type { FormEvent, JSX } from 'react';
import { useEffect, useState } from 'react';

import { GameShell } from '../../app/GameShell';
import { clearDraft, loadDraft, saveDraft } from '../../shared/draftStorage';
import {
  createStopwatchGame,
  isStopwatchDraft,
  stopwatchReducer,
  type StopwatchState,
} from './stopwatchMachine';
import { lowestPlayerIds } from './stopwatchRules';
import './stopwatch.css';

const initialNames = () => ['', ''];

function formatElapsed(elapsedMs: number): string {
  const safeElapsed = Math.max(0, elapsedMs);
  const minutes = Math.floor(safeElapsed / 60000);
  const seconds = Math.floor(safeElapsed / 1000) % 60;
  const hundredths = Math.floor(safeElapsed / 10) % 100;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(hundredths).padStart(2, '0')}`;
}

export function StopwatchPage(): JSX.Element {
  const [names, setNames] = useState(initialNames);
  const [game, setGame] = useState<StopwatchState | null>(() => loadDraft('stopwatch', isStopwatchDraft));
  const [elapsedMs, setElapsedMs] = useState(0);
  const [wasAttemptInvalidated, setWasAttemptInvalidated] = useState(false);
  const startedAt = game?.startedAt ?? null;

  useEffect(() => {
    if (game === null) return;
    saveDraft('stopwatch', { ...game, startedAt: null });
  }, [game]);

  useEffect(() => {
    if (startedAt === null) return;

    let frameId = 0;
    const updateElapsed = () => {
      setElapsedMs(performance.now() - startedAt);
      frameId = requestAnimationFrame(updateElapsed);
    };
    frameId = requestAnimationFrame(updateElapsed);

    return () => cancelAnimationFrame(frameId);
  }, [startedAt]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState !== 'hidden' || startedAt === null) return;

      setGame((current) => (
        current ? stopwatchReducer(current, { type: 'invalidate-running-attempt' }) : current
      ));
      setElapsedMs(0);
      setWasAttemptInvalidated(true);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [startedAt]);

  function reset() {
    clearDraft('stopwatch');
    setNames(initialNames());
    setGame(null);
    setElapsedMs(0);
    setWasAttemptInvalidated(false);
  }

  function startGame(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!names.every((name) => name.trim())) return;
    setGame(createStopwatchGame(names.map((name) => name.trim())));
  }

  function toggleTimer() {
    const now = performance.now();
    setWasAttemptInvalidated(false);
    setGame((current) => (
      current
        ? stopwatchReducer(current, { type: current.startedAt === null ? 'start' : 'stop', now })
        : current
    ));
    setElapsedMs(0);
  }

  function restart() {
    reset();
  }

  const currentPlayer = game?.players[game.currentPlayerIndex];
  const selectedPlayer = game?.phase === 'result'
    ? game.players.find(({ id }) => id === lowestPlayerIds(
      game.players
        .filter(({ id }) => game.roundPlayerIds.includes(id))
        .map(({ id, score }) => ({ id, score: score ?? 0 })),
    )[0])
    : undefined;

  return (
    <GameShell title="스톱워치" dirty={names.some((name) => name.length > 0) || game !== null} onReset={reset}>
      {game === null ? (
        <form className="stopwatch-setup" onSubmit={startGame}>
          <div className="stopwatch-setup__intro">
            <h2>참가자 설정</h2>
            <p>측정할 순서대로 이름을 입력하세요.</p>
          </div>
          <div className="stopwatch-setup__list">
            {names.map((name, index) => (
              <div className="stopwatch-player-row" key={index}>
                <label className="stopwatch-player-row__field">
                  <span>참가자 {index + 1}</span>
                  <input
                    value={name}
                    placeholder="이름"
                    onChange={(event) => setNames((current) => current.map((item, itemIndex) => (
                      itemIndex === index ? event.target.value : item
                    )))}
                  />
                </label>
                <button
                  className="stopwatch-player-row__remove"
                  type="button"
                  aria-label={`참가자 ${index + 1} 삭제`}
                  disabled={names.length <= 2}
                  onClick={() => setNames((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                >
                  삭제
                </button>
              </div>
            ))}
          </div>
          <div className="stopwatch-setup__actions">
            <button type="button" onClick={() => setNames((current) => [...current, ''])}>참가자 추가</button>
            <button className="button--accent" type="submit" disabled={!names.every((name) => name.trim())}>게임 시작</button>
          </div>
        </form>
      ) : game.phase === 'result' && selectedPlayer ? (
        <section className="stopwatch-result">
          <header className="stopwatch-result__selected">
            <p>선택된 사람</p>
            <h2 className="stopwatch-name-wrap">{selectedPlayer.name} 님이 선택됐어요</h2>
          </header>
          <ul className="stopwatch-result__scores" aria-label="전체 점수">
            {game.players.map((player) => (
              <li className="stopwatch-name-wrap" key={player.id}>
                {player.name} {player.attempts[0]} × {player.attempts[1]} = {player.score}
              </li>
            ))}
          </ul>
          <button className="button--accent stopwatch-result__restart" type="button" onClick={restart}>다시 하기</button>
        </section>
      ) : currentPlayer ? (
        <section className="stopwatch-play">
          <header className="stopwatch-play__header">
            <p>{game.round}라운드</p>
            <h2 className="stopwatch-name-wrap">{currentPlayer.name} 차례예요</h2>
          </header>
          {game.round > 1 && (
            <aside className="stopwatch-rematch">
              <strong>최저 점수 동점 — 동점자만 다시 측정합니다</strong>
              <p className="stopwatch-name-wrap">
                {game.players.filter(({ id }) => game.roundPlayerIds.includes(id)).map(({ name }) => name).join(', ')}
              </p>
            </aside>
          )}
          <p className="stopwatch-play__attempt">{currentPlayer.attempts.length === 0 ? '첫 번째' : '두 번째'} 측정</p>
          {wasAttemptInvalidated && <p role="status">측정이 취소됐어요. 다시 시작해 주세요.</p>}
          <output className="stopwatch-timer" aria-label="경과 시간" aria-live="off">{formatElapsed(elapsedMs)}</output>
          <button className="button--accent stopwatch-play__control" type="button" onClick={toggleTimer}>
            {game.startedAt === null ? '시작' : '멈추기'}
          </button>
          <dl className="stopwatch-score">
            <div>
              <dt>첫 번째 저장 숫자</dt>
              <dd><output aria-label="첫 번째 저장 숫자">{currentPlayer.attempts[0] ?? '—'}</output></dd>
            </div>
            <div>
              <dt>두 번째 저장 숫자</dt>
              <dd><output aria-label="두 번째 저장 숫자">{currentPlayer.attempts[1] ?? '—'}</output></dd>
            </div>
            <div>
              <dt>곱</dt>
              <dd>{currentPlayer.score ?? '—'}</dd>
            </div>
          </dl>
        </section>
      ) : null}
    </GameShell>
  );
}
