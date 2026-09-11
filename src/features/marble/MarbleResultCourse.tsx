import { useEffect, useRef, type JSX } from 'react';

import { MarbleArrivals } from './MarbleArrivals';
import type { MarbleGameConfig } from './MarbleSetup';
import { CanvasRenderer } from './engine/CanvasRenderer';
import type { CameraView } from './engine/Camera';
import { NOTME_COURSE } from './engine/course';
import type { FinishedMarble, RaceSnapshot } from './engine/RouletteEngine';

type MarbleResultCourseProps = {
  config: MarbleGameConfig;
  finishOrder: FinishedMarble[];
  snapshot?: RaceSnapshot;
  cameraView?: CameraView;
};

export function MarbleResultCourse({
  config, finishOrder, snapshot, cameraView,
}: MarbleResultCourseProps): JSX.Element {
  const mainRef = useRef<HTMLCanvasElement>(null);
  const minimapRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const main = mainRef.current!.getContext('2d');
    const minimap = minimapRef.current!.getContext('2d');
    if (!main || !minimap) return;
    const renderer = new CanvasRenderer(NOTME_COURSE, config.shuffledMarbles);
    // 새로고침으로 복구한 결과만 전체 코스 정적 화면으로 대체한다.
    const fallbackSnapshot: RaceSnapshot = {
      active: [],
      skillEffects: [],
      skillActivationCount: 0,
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
      const fallbackView: CameraView = {
        leftX: (NOTME_COURSE.width - viewWidth) / 2,
        width: viewWidth,
        centerY: NOTME_COURSE.goalY / 2,
        topY: (NOTME_COURSE.goalY - viewHeight) / 2,
        height: viewHeight,
        zoom: 1,
      };
      renderer.render({ main, minimap }, snapshot ?? fallbackSnapshot, cameraView ?? fallbackView);
    };
    draw();
    window.addEventListener('resize', draw);
    return () => window.removeEventListener('resize', draw);
  }, [cameraView, config, finishOrder, snapshot]);

  return (
    <div className="marble-race__stage marble-result__course">
      <canvas ref={mainRef} className="marble-race__canvas" aria-label="마블 레이스 코스" />
      <canvas ref={minimapRef} className="marble-race__minimap" aria-label="전체 코스 미니맵" />
      <MarbleArrivals config={config} finishOrder={finishOrder} />
    </div>
  );
}
