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
  it('first는 y가 가장 큰 선두 전체가 보이는 범위 안에서 보간한다', () => {
    const camera = new Camera();

    const view = camera.update(createSnapshot('first', [
      { id: 'a:0', y: 40 },
      { id: 'b:0', y: 80 },
      { id: 'c:0', y: 60 },
    ]), NOTME_COURSE);

    expect(view.centerY).toBeCloseTo(68.25);
    expect(view.topY).toBeCloseTo(56.25);
    expect(view.height).toBe(24);
  });

  it('last는 y가 가장 작은 후미 전체가 보이는 범위 안에서 보간한다', () => {
    const camera = new Camera();

    const view = camera.update(createSnapshot('last', [
      { id: 'a:0', y: 40 },
      { id: 'b:0', y: 80 },
      { id: 'c:0', y: 60 },
    ]), NOTME_COURSE);

    expect(view.centerY).toBeCloseTo(28.25);
    expect(view.topY).toBeCloseTo(16.25);
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

    expect(view).toMatchObject({ centerY: 12, topY: 0, height: 24, zoom: 1 });
  });

  it('goal 근처 active가 사라져도 직전 zoom과 viewport를 유지한다', () => {
    const camera = new Camera();
    const nearGoal = camera.update(
      createSnapshot('first', [{ id: 'a:0', y: 114 }]),
      NOTME_COURSE,
    );

    const empty = camera.update(createSnapshot('first', []), NOTME_COURSE);

    expect(empty).toEqual(nearGoal);
  });

  it('active가 없는 화면도 크기 변경에 맞춰 실제 가시 범위를 다시 계산한다', () => {
    const camera = new Camera();
    camera.update(createSnapshot('first', []), NOTME_COURSE, { width: 288, height: 360 });
    const view = camera.update(createSnapshot('first', []), NOTME_COURSE, { width: 288, height: 496 });
    expect(view.width / view.height).toBeCloseTo(288 / 496);
    expect(view.width).toBeGreaterThan(26);
  });
});
