import { useEffect, useLayoutEffect, useMemo, useRef, type JSX } from 'react';

import type { MarbleGameConfig } from './MarbleSetup';
import type { FinishedMarble } from './engine/RouletteEngine';
import { createMarbleColors, marbleLabel } from './marblePresentation';

type MarbleArrivalsProps = {
  config: MarbleGameConfig;
  finishOrder: readonly FinishedMarble[];
};

export function MarbleArrivals({ config, finishOrder }: MarbleArrivalsProps): JSX.Element {
  const colors = useMemo(() => createMarbleColors(config.shuffledMarbles), [config.shuffledMarbles]);
  const listRef = useRef<HTMLOListElement>(null);
  const resumeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const automaticScrollTop = useRef<number | null>(null);

  function followLatest() {
    const list = listRef.current!;
    const target = Math.max(0, list.scrollHeight - list.clientHeight);
    if (list.scrollTop === target) return;
    list.scrollTop = target;
    // 브라우저가 실제 적용한 위치를 기억해 자체 scroll 이벤트를 사용자 입력과 구분한다.
    automaticScrollTop.current = list.scrollTop;
  }

  function pauseFollowing() {
    if (resumeTimer.current !== null) clearTimeout(resumeTimer.current);
    resumeTimer.current = setTimeout(() => {
      resumeTimer.current = null;
      followLatest();
    }, 2000);
  }

  useLayoutEffect(() => {
    if (resumeTimer.current === null) followLatest();
  }, [finishOrder.length]);

  useEffect(() => () => {
    if (resumeTimer.current !== null) clearTimeout(resumeTimer.current);
  }, []);

  return (
    <section className="marble-arrivals" aria-label="확정 도착 순위">
      <p className="marble-arrivals__count" aria-label="도착 진행">도착 {finishOrder.length} / {config.shuffledMarbles.length}</p>
      <ol
        ref={listRef}
        className="marble-arrivals__list"
        aria-label="도착 명단"
        tabIndex={0}
        onWheel={pauseFollowing}
        onTouchMove={pauseFollowing}
        onScroll={() => {
          const isAutomatic = automaticScrollTop.current !== null
            && Math.abs(listRef.current!.scrollTop - automaticScrollTop.current) < 1;
          automaticScrollTop.current = null;
          if (!isAutomatic) pauseFollowing();
        }}
      >
        {finishOrder.map((marble) => (
          <li key={marble.id}>
            <i className="marble-color" style={{ backgroundColor: colors.get(marble.id) }} aria-hidden="true" />
            <span>{marble.rank}위 {marbleLabel(marble)}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
