// @vitest-environment node

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Box2dPhysics } from './Box2dPhysics';
import type { CourseDefinition } from './types';

const testCourse: CourseDefinition = {
  width: 10,
  viewportHeight: 10,
  goalY: 20,
  walls: [],
  sections: [],
  goalSensor: {
    from: { x: 0, y: 20 },
    to: { x: 10, y: 20 },
  },
};

function getBodyCount(physics: Box2dPhysics): number {
  const { world } = physics as unknown as {
    world: { GetBodyCount(): number } | null;
  };

  if (!world) throw new Error('Box2D world가 초기화되지 않았습니다.');
  return world.GetBodyCount();
}

describe('Box2dPhysics', () => {
  let physics: Box2dPhysics;

  beforeEach(async () => {
    // box2d-wasm 7.0의 Node 로더가 로컬 WASM을 fetch로 오인하지 않도록 한다.
    vi.stubGlobal('fetch', undefined);
    physics = new Box2dPhysics();
    await physics.init();
  });

  afterEach(() => {
    physics.destroy();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('중력 스텝 다음 구슬의 y가 증가한다', async () => {
    physics.createCourse(testCourse);
    physics.createMarble({ id: 'a:0', x: 5, y: 1 });

    for (let index = 0; index < 60; index += 1) physics.step(1 / 60);

    expect(physics.getMarble('a:0')!.y).toBeGreaterThan(1);
  });

  it('삭제한 ID의 구슬만 제거한다', () => {
    physics.createMarble({ id: 'a:0', x: 5, y: 1 });
    physics.createMarble({ id: 'b:0', x: 6, y: 1 });

    physics.removeMarble('a:0');

    expect(physics.getMarble('a:0')).toBeNull();
    expect(physics.getMarble('b:0')).not.toBeNull();
  });

  it('같은 ID로 구슬을 다시 만들면 이전 물리 body를 교체한다', () => {
    physics.createMarble({ id: 'a:0', x: 5, y: 1 });
    physics.createMarble({ id: 'a:0', x: 6, y: 1 });

    expect(getBodyCount(physics)).toBe(1);
    expect(physics.getMarble('a:0')).toMatchObject({ x: 6, y: 1 });
  });

  it('코스를 다시 만들면 이전 코스 body를 정리한다', () => {
    physics.createCourse(testCourse);
    physics.createCourse(testCourse);

    expect(getBodyCount(physics)).toBe(1);
  });

  it('선분과 원형 자애물을 물리 코스에 배치한다', () => {
    physics.createCourse({
      ...testCourse,
      sections: [
        {
          kind: 'ramps',
          obstacles: [
            { kind: 'line', from: { x: 1, y: 3 }, to: { x: 9, y: 3 } },
          ],
        },
        {
          kind: 'pins',
          obstacles: [{ kind: 'circle', center: { x: 1, y: 6 }, radius: 0.5 }],
        },
        {
          kind: 'spinner',
          obstacles: [
            {
              kind: 'spinner',
              center: { x: 8, y: 6 },
              length: 2,
              angle: 0,
              angularVelocity: 2,
            },
          ],
        },
      ],
    });
    physics.createMarble({ id: 'a:0', x: 5, y: 1 });

    for (let index = 0; index < 120; index += 1) physics.step(1 / 60);

    expect(physics.getMarble('a:0')!.y).toBeLessThan(3);
  });

  it('원형 센서눈 구슬을 막지 않는다', () => {
    physics.createCourse({
      ...testCourse,
      goalSensor: {
        from: { x: 0, y: 2 },
        to: { x: 10, y: 2 },
      },
    });
    physics.createMarble({ id: 'a:0', x: 5, y: 1 });

    for (let index = 0; index < 60; index += 1) physics.step(1 / 60);

    expect(physics.getMarble('a:0')!.y).toBeGreaterThan(3);
  });

  it('정체한 구슬에 흔들기 충격을 가한다', () => {
    vi.spyOn(Math, 'random').mockReturnValueOnce(1).mockReturnValueOnce(0.5);
    physics.createMarble({ id: 'a:0', x: 5, y: 1 });

    physics.shakeMarble('a:0');
    physics.step(1 / 60);

    expect(physics.getMarble('a:0')!.x).toBeGreaterThan(5);
  });

  it('임패트가 반경 10 안의 다른 구슬만 밀어낸다', () => {
    physics.createMarble({ id: 'source', x: 5, y: 1 });
    physics.createMarble({ id: 'near', x: 6, y: 1 });
    physics.createMarble({ id: 'far', x: 20, y: 1 });

    physics.impact('source');
    physics.step(1 / 60);

    expect(physics.getMarble('near')!.x).toBeGreaterThan(6);
    expect(physics.getMarble('far')!.x).toBeCloseTo(20, 5);
  });

  it('스냅샷마다 반환된 position wrapper를 cache에서 해제한다', () => {
    const { box2d } = physics as unknown as {
      box2d: { LeakMitigator: { freeFromCache: (wrapper: unknown) => void } };
    };
    physics.createMarble({ id: 'a:0', x: 5, y: 1 });
    const freeFromCache = vi.spyOn(box2d.LeakMitigator, 'freeFromCache');

    for (let index = 0; index < 120; index += 1) physics.getMarble('a:0');

    expect(freeFromCache).toHaveBeenCalledTimes(120);
  });

  it('destroy 뒤 다시 초기화한 world에서 새 구슬을 만들 수 있다', async () => {
    physics.createMarble({ id: 'a:0', x: 5, y: 1 });

    physics.destroy();
    await physics.init();
    physics.createMarble({ id: 'b:0', x: 6, y: 2 });

    expect(physics.getMarble('a:0')).toBeNull();
    expect(physics.getMarble('b:0')).toMatchObject({ x: 6, y: 2 });
  });
});
