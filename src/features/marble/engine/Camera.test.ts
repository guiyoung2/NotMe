import { describe, expect, it } from 'vitest';

import { Camera } from './Camera';
import { NOTME_COURSE } from './course';
import type { RaceSnapshot } from './RouletteEngine';

function createSnapshot(
  winnerMode: RaceSnapshot['winnerMode'],
  positions: Array<{ id: string; y: number }>,
): RaceSnapshot {
  return {
    active: positions.map(({ id, y }) => ({
      id,
      participantId: id.split(':')[0],
      name: id,
      body: { id, x: 13, y, angle: 0, radius: 0.25 },
    })),
    dynamicObstacles: [],
    finishOrder: [],
    winner: null,
    winnerMode,
    speed: 1,
  };
}

describe('Camera', () => {
  it('first는 y가 가장 큰 active 선두를 10% 보간해 추적한다', () => {
    const camera = new Camera();

    const view = camera.update(createSnapshot('first', [
      { id: 'a:0', y: 40 },
      { id: 'b:0', y: 80 },
      { id: 'c:0', y: 60 },
    ]), NOTME_COURSE);

    expect(view.centerY).toBeCloseTo(18.8);
    expect(view.topY).toBeCloseTo(6.8);
    expect(view.height).toBe(24);
  });

  it('last는 y가 가장 작은 active 후미를 10% 보간해 추적한다', () => {
    const camera = new Camera();

    const view = camera.update(createSnapshot('last', [
      { id: 'a:0', y: 40 },
      { id: 'b:0', y: 80 },
      { id: 'c:0', y: 60 },
    ]), NOTME_COURSE);

    expect(view.centerY).toBeCloseTo(14.8);
    expect(view.topY).toBeCloseTo(2.8);
    expect(view.height).toBe(24);
  });

  it('골인 12단위 안에서 zoom을 1부터 2까지 연속 증가시킨다', () => {
    const outside = new Camera().update(
      createSnapshot('first', [{ id: 'a:0', y: 108 }]),
      NOTME_COURSE,
    );
    const halfway = new Camera().update(
      createSnapshot('first', [{ id: 'a:0', y: 114 }]),
      NOTME_COURSE,
    );
    const goal = new Camera().update(
      createSnapshot('first', [{ id: 'a:0', y: 120 }]),
      NOTME_COURSE,
    );

    expect(outside.zoom).toBe(1);
    expect(halfway.zoom).toBeCloseTo(1.5);
    expect(goal.zoom).toBe(2);
    expect(goal.height).toBe(12);
  });

  it('반복 update 뒤에도 표시 범위를 코스 상단과 goal 사이로 제한한다', () => {
    const upperCamera = new Camera();
    const lowerCamera = new Camera();

    let upper = upperCamera.update(createSnapshot('last', [{ id: 'a:0', y: -100 }]), NOTME_COURSE);
    let lower = lowerCamera.update(createSnapshot('first', [{ id: 'a:0', y: 200 }]), NOTME_COURSE);
    for (let index = 0; index < 200; index += 1) {
      upper = upperCamera.update(createSnapshot('last', [{ id: 'a:0', y: -100 }]), NOTME_COURSE);
      lower = lowerCamera.update(createSnapshot('first', [{ id: 'a:0', y: 200 }]), NOTME_COURSE);
    }

    expect(upper.topY).toBeGreaterThanOrEqual(0);
    expect(upper.centerY).toBeGreaterThanOrEqual(upper.height / 2);
    expect(lower.centerY).toBeLessThanOrEqual(NOTME_COURSE.goalY - lower.height / 2);
    expect(lower.topY + lower.height).toBeLessThanOrEqual(NOTME_COURSE.goalY);
  });

  it('active가 없으면 유한하고 안전한 코스 상단 viewport를 반환한다', () => {
    const view = new Camera().update(createSnapshot('first', []), NOTME_COURSE);

    expect(view).toEqual({ centerY: 12, topY: 0, height: 24, zoom: 1 });
  });
});
