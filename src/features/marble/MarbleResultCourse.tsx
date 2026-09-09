import { useEffect, useRef, type JSX } from 'react';

import { MarbleArrivals } from './MarbleArrivals';
import type { MarbleGameConfig } from './MarbleSetup';
import { CanvasRenderer } from './engine/CanvasRenderer';
import { NOTME_COURSE } from './engine/course';
import type { FinishedMarble, RaceSnapshot } from './engine/RouletteEngine';

type MarbleResultCourseProps = {
  config: MarbleGameConfig;
  finishOrder: FinishedMarble[];
};

export function MarbleResultCourse({ config, finishOrder }: MarbleResultCourseProps): JSX.Element {
  const mainRef = useRef<HTMLCanvasElement>(null);
  const minimapRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const main = mainRef.current!.getContext('2d');
    const minimap = minimapRef.current!.getContext('2d');
    if (!main || !minimap) return;
    const renderer = new CanvasRenderer(NOTME_COURSE, config.shuffledMarbles);
    // 완주·복구 모두 물리 body 없이 전체 코스를 정적으로 표시한다.
    const snapshot: RaceSnapshot = {
      active: [],
      dynamicObstacles: NOTME_COURSE.sections.flatMap(({ obstacles }) => (
        obstacles.filter((obstacle) => obstacle.kind === 'spinner')
      )),
      finishOrder,
      winner: config.winnerMode === 'first' ? finishOrder[0] : finishOrder.at(-1)!,
      winnerMode: config.winnerMode,
      speed: 1,
    };
    const draw = () => {
      const bounds = mainRef.current!.getBoundingClientRect();
      const width = bounds.width || 1;
      const height = bounds.height || 1;
      const scale = Math.min(width / (NOTME_COURSE.width + 1), height / (NOTME_COURSE.goalY + 2));
      const viewHeight = height / scale;
      const viewWidth = width / scale;
      renderer.render({ main, minimap }, snapshot, {
        leftX: (NOTME_COURSE.width - viewWidth) / 2,
        width: viewWidth,
        centerY: NOTME_COURSE.goalY / 2,
        topY: (NOTME_COURSE.goalY - viewHeight) / 2,
        height: viewHeight,
        zoom: 1,
      });
    };
    draw();
    window.addEventListener('resize', draw);
    return () => window.removeEventListener('resize', draw);
  }, [config, finishOrder]);

  return (
    <div className="marble-race__stage marble-result__course">
      <canvas ref={mainRef} className="marble-race__canvas" aria-label="마블 레이스 코스" />
      <canvas ref={minimapRef} className="marble-race__minimap" aria-label="전체 코스 미니맵" />
      <MarbleArrivals config={config} finishOrder={finishOrder} />
    </div>
  );
}
