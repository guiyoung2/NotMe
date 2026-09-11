import { describe, expect, it, vi } from 'vitest';

import type { MarbleSeed, RandomSource } from '../marbleConfig';
import { NOTME_COURSE } from './course';
import { RouletteEngine } from './RouletteEngine';
import type {
  BodySnapshot,
  CourseDefinition,
  DynamicObstacleSnapshot,
  PhysicsAdapter,
} from './types';

type MarblePosition = Pick<BodySnapshot, 'x' | 'y' | 'angle' | 'radius'>;

class FakePhysics implements PhysicsAdapter {
  readonly marbles = new Map<string, MarblePosition>();
  readonly created: Array<{ id: string; x: number; y: number }> = [];
  readonly stepSeconds: number[] = [];
  readonly removed: string[] = [];
  readonly shaken: string[] = [];
  readonly impacted: string[] = [];
  dynamicObstacles: DynamicObstacleSnapshot[] = [];
  createdCourse: CourseDefinition | null = null;
  destroyCount = 0;
  onStep?: (step: number, physics: FakePhysics) => void;

  async init(): Promise<void> {}

  createCourse(course: CourseDefinition): void {
    this.createdCourse = course;
  }

  createMarble(seed: { id: string; x: number; y: number }): void {
    this.created.push(seed);
    this.marbles.set(seed.id, { x: seed.x, y: seed.y, angle: 0, radius: 0.25 });
  }

  step(seconds: number): void {
    this.stepSeconds.push(seconds);
    this.onStep?.(this.stepSeconds.length, this);
  }

  getMarble(id: string): BodySnapshot | null {
    const marble = this.marbles.get(id);
    return marble ? { id, ...marble } : null;
  }

  removeMarble(id: string): void {
    this.removed.push(id);
    this.marbles.delete(id);
  }

  shakeMarble(id: string): void {
    this.shaken.push(id);
  }

  impact(id: string): void {
    this.impacted.push(id);
  }

  getDynamicObstacles(): DynamicObstacleSnapshot[] {
    return this.dynamicObstacles;
  }

  destroy(): void {
    this.destroyCount += 1;
    this.marbles.clear();
  }
}

class ReusingSnapshotPhysics extends FakePhysics {
  private readonly bodies = new Map<string, BodySnapshot>();

  override getMarble(id: string): BodySnapshot | null {
    const reused = this.bodies.get(id);
    if (reused) return reused;

    const body = super.getMarble(id);
    if (body) this.bodies.set(id, body);
    return body;
  }
}

const seeds: MarbleSeed[] = [
  { id: 'b:0', participantId: 'b', name: '철수' },
  { id: 'a:0', participantId: 'a', name: '짱구' },
  { id: 'c:0', participantId: 'c', name: '유리' },
];
const GOAL_CENTER_X = (NOTME_COURSE.goalSensor.from.x + NOTME_COURSE.goalSensor.to.x) / 2;

function createEngine(
  physics: PhysicsAdapter,
  overrides: Partial<ConstructorParameters<typeof RouletteEngine>[0]> = {},
): RouletteEngine {
  return new RouletteEngine({
    physics,
    marbles: seeds,
    winnerMode: 'last',
    skillsEnabled: false,
    random: () => 1,
    ...overrides,
  });
}

function advanceSteps(engine: RouletteEngine, count: number): void {
  for (let index = 0; index < count; index += 1) engine.advance(10);
}

describe('RouletteEngine 순위', () => {
  it('중복된 구슬 ID를 생성 경계에서 명확한 오류로 거부한다', () => {
    const duplicateSeeds: MarbleSeed[] = [
      { id: 'a:0', participantId: 'a', name: '짱구' },
      { id: 'a:0', participantId: 'b', name: '철수' },
    ];

    expect(() => createEngine(new FakePhysics(), { marbles: duplicateSeeds }))
      .toThrow('구슬 ID가 중복되었습니다: a:0');
  });

  it('마지막 모드에서는 한 구슬만 남으면 골인 전에도 마지막 순위로 확정한다', async () => {
    const physics = new FakePhysics();
    physics.onStep = (step, current) => {
      if (step === 1) Object.assign(current.marbles.get('b:0')!, { x: GOAL_CENTER_X, y: NOTME_COURSE.goalY });
      if (step === 2) Object.assign(current.marbles.get('a:0')!, { x: GOAL_CENTER_X, y: NOTME_COURSE.goalY + 1 });
    };
    const engine = createEngine(physics);
    await engine.init();

    engine.advance(10);
    expect(engine.snapshot().finishOrder.map(({ id }) => id)).toEqual(['b:0']);
    expect(engine.snapshot().winner).toBeNull();

    engine.advance(10);
    expect(engine.snapshot().finishOrder.map(({ id }) => id)).toEqual(['b:0', 'a:0', 'c:0']);
    expect(engine.snapshot().winner?.id).toBe('c:0');
    expect(engine.snapshot().active.map(({ id }) => id)).toEqual(['c:0']);
    expect(physics.removed).toEqual(['b:0', 'a:0']);
    expect(physics.stepSeconds).toEqual([0.01, 0.01]);
  });

  it('코스 안에서 골인 y를 교차한 센서 밖 구슬도 골인한다', async () => {
    const physics = new FakePhysics();
    physics.onStep = (step, current) => {
      const y = step === 1 ? NOTME_COURSE.goalY - 1 : NOTME_COURSE.goalY + 1;
      Object.assign(current.marbles.get('b:0')!, { x: GOAL_CENTER_X, y });
      Object.assign(current.marbles.get('a:0')!, { x: 5, y });
      Object.assign(current.marbles.get('c:0')!, { x: 21, y });
    };
    const engine = createEngine(physics);
    await engine.init();

    engine.advance(20);

    expect(engine.snapshot().finishOrder).toEqual([
      { id: 'b:0', participantId: 'b', name: '철수', rank: 1 },
      { id: 'a:0', participantId: 'a', name: '짱구', rank: 2 },
      { id: 'c:0', participantId: 'c', name: '유리', rank: 3 },
    ]);
    expect(physics.removed).toEqual(['b:0', 'a:0', 'c:0']);
  });

  it.each([5, 21, 0.1])('센서 밖 x=%s라도 코스 안에서 골인 y를 교차하면 기록한다', async (x) => {
    const physics = new FakePhysics();
    physics.onStep = (step, current) => {
      if (step === 1) Object.assign(current.marbles.get('b:0')!, { x, y: NOTME_COURSE.goalY });
    };
    const engine = createEngine(physics);
    await engine.init();

    engine.advance(10);

    expect(engine.snapshot().finishOrder).toEqual([
      { id: 'b:0', participantId: 'b', name: '철수', rank: 1 },
    ]);
  });

  it('전체 순위가 확정된 뒤에만 first 당첨자를 공개한다', async () => {
    const physics = new FakePhysics();
    physics.onStep = (step, current) => {
      if (step === 1) Object.assign(current.marbles.get('b:0')!, { x: GOAL_CENTER_X, y: NOTME_COURSE.goalY });
      if (step === 2) Object.assign(current.marbles.get('a:0')!, { x: GOAL_CENTER_X, y: NOTME_COURSE.goalY });
      if (step === 3) Object.assign(current.marbles.get('c:0')!, { x: GOAL_CENTER_X, y: NOTME_COURSE.goalY });
    };
    const engine = createEngine(physics, { winnerMode: 'first' });
    await engine.init();

    engine.advance(10);
    expect(engine.snapshot().winner).toBeNull();

    engine.advance(20);
    expect(engine.snapshot().winner?.id).toBe('b:0');
  });

  it.each([
    { x: -1, y: NOTME_COURSE.goalY + 1 },
    { x: NOTME_COURSE.width + 1, y: NOTME_COURSE.goalY + 1 },
    { x: GOAL_CENTER_X, y: -1 },
    { x: Number.NaN, y: NOTME_COURSE.goalY },
  ])('코스 밖 또는 비유한 위치 ($x, $y)는 기록하지 않고 원래 시작 위치로 복구한다', async (position) => {
    const physics = new FakePhysics();
    const engine = createEngine(physics);
    await engine.init();
    const start = physics.getMarble('b:0');
    physics.onStep = (step, current) => {
      if (step === 1) Object.assign(current.marbles.get('b:0')!, position);
    };

    engine.advance(10);

    expect(engine.snapshot().finishOrder).toEqual([]);
    expect(physics.getMarble('b:0')).toEqual(start);
    engine.advance(10);
    expect(engine.snapshot().finishOrder).toEqual([]);
  });

  it('같은 step의 동시 도착을 전달된 shuffled seed 순서로 확정한다', async () => {
    const physics = new FakePhysics();
    physics.onStep = (_step, current) => {
      for (const marble of current.marbles.values()) {
        Object.assign(marble, { x: GOAL_CENTER_X, y: NOTME_COURSE.goalY });
      }
    };
    const engine = createEngine(physics);
    await engine.init();

    engine.advance(10);

    expect(engine.snapshot().finishOrder).toEqual([
      { ...seeds[0], rank: 1 },
      { ...seeds[1], rank: 2 },
      { ...seeds[2], rank: 3 },
    ]);
  });
});

describe('RouletteEngine 고정 step과 배속', () => {
  it('10ms step을 사용하고 실제 frame delta를 100ms로 제한한다', async () => {
    const physics = new FakePhysics();
    const engine = createEngine(physics);
    await engine.init();

    engine.advance(9);
    expect(physics.stepSeconds).toEqual([]);
    engine.advance(1);
    expect(physics.stepSeconds).toEqual([0.01]);

    engine.advance(1_000);
    expect(physics.stepSeconds).toHaveLength(11);
    expect(new Set(physics.stepSeconds)).toEqual(new Set([0.01]));
  });

  it.each([
    { delta: 16.7, normalSteps: 1670, fastSteps: 6680 },
    { delta: 33.3, normalSteps: 3330, fastSteps: 13320 },
    { delta: 50, normalSteps: 5000, fastSteps: 20000 },
    { delta: 100, normalSteps: 10000, fastSteps: 40000 },
  ])('$delta ms 프레임에서도 실제 진행량의 4배를 유지한다', async ({ delta, normalSteps, fastSteps }) => {
    const normal = new FakePhysics();
    const fast = new FakePhysics();
    const normalEngine = createEngine(normal);
    const fastEngine = createEngine(fast);
    await normalEngine.init();
    await fastEngine.init();
    fastEngine.setFastForward(true);

    for (let frame = 0; frame < 1000; frame += 1) {
      normalEngine.advance(delta);
      fastEngine.advance(delta);
    }

    expect(normal.stepSeconds.length).toBeGreaterThanOrEqual(normalSteps - 1);
    expect(normal.stepSeconds.length).toBeLessThanOrEqual(normalSteps);
    expect(fast.stepSeconds.length).toBeGreaterThanOrEqual(fastSteps - 1);
    expect(fast.stepSeconds.length).toBeLessThanOrEqual(fastSteps);
    expect(new Set(fast.stepSeconds)).toEqual(new Set([0.01]));
  });

  it('음수와 비유한 frame delta를 accumulator에 반영하지 않는다', async () => {
    const physics = new FakePhysics();
    const engine = createEngine(physics);
    await engine.init();

    engine.advance(5);
    engine.advance(-10);
    engine.advance(Number.NaN);
    engine.advance(Number.POSITIVE_INFINITY);
    engine.advance(5);

    expect(physics.stepSeconds).toEqual([0.01]);
  });

  it('4배속은 step 크기가 아니라 소비 step 수만 늘리고 해제 즉시 1배속으로 복귀한다', async () => {
    const physics = new FakePhysics();
    const engine = createEngine(physics);
    await engine.init();

    engine.setFastForward(true);
    engine.advance(10);
    expect(physics.stepSeconds).toEqual([0.01, 0.01, 0.01, 0.01]);
    expect(engine.snapshot().speed).toBe(4);

    engine.setFastForward(false);
    engine.advance(10);
    expect(physics.stepSeconds).toEqual([0.01, 0.01, 0.01, 0.01, 0.01]);
    expect(engine.snapshot().speed).toBe(1);
  });
});

describe('RouletteEngine 스킬과 정체 해소', () => {
  it('6초 뒤 선택된 구슬 하나에 충격을 가하고 발동 전 위치와 누적 횟수를 기록한다', async () => {
    const physics = new FakePhysics();
    const values = [0, 0.5, 1, 0, 0];
    const random = vi.fn<RandomSource>(() => values.shift()!);
    physics.impact = (id) => {
      physics.impacted.push(id);
      physics.marbles.get(id)!.x = 20;
    };
    const engine = createEngine(physics, { skillsEnabled: true, random });
    await engine.init();

    expect(random).not.toHaveBeenCalled();
    advanceSteps(engine, 599);
    expect(random).toHaveBeenCalledTimes(1);
    expect(physics.impacted).toEqual([]);
    advanceSteps(engine, 1);

    expect(random).toHaveBeenCalledTimes(3);
    expect(physics.impacted).toEqual(['a:0']);
    expect(engine.snapshot().skillEffects).toEqual([
      { id: 1, center: { x: 10.85, y: 1 }, elapsedMs: 0, durationMs: 500 },
    ]);
    expect(engine.snapshot().skillActivationCount).toBe(1);
    advanceSteps(engine, 799);
    expect(physics.impacted).toEqual(['a:0']);
    advanceSteps(engine, 1);
    expect(physics.impacted).toEqual(['a:0', 'b:0']);
    expect(engine.snapshot().skillActivationCount).toBe(2);
    expect(engine.snapshot().skillEffects).toEqual([
      { id: 2, center: { x: 10.25, y: 1 }, elapsedMs: 0, durationMs: 500 },
    ]);
  });

  it('효과는 499ms까지 남고 500ms에서 사라지며 snapshot 변경에 영향받지 않는다', async () => {
    const physics = new FakePhysics();
    const engine = createEngine(physics, { skillsEnabled: true, random: () => 0 });
    await engine.init();
    advanceSteps(engine, 600);
    const snapshot = engine.snapshot();
    snapshot.skillEffects[0].center.x = 999;
    snapshot.skillEffects[0].elapsedMs = 999;

    advanceSteps(engine, 49);
    engine.advance(9);
    expect(engine.snapshot().skillEffects).toEqual([
      { id: 1, center: { x: 10.25, y: 1 }, elapsedMs: 490, durationMs: 500 },
    ]);
    engine.advance(1);
    expect(engine.snapshot().skillEffects).toEqual([]);
    expect(engine.snapshot().skillActivationCount).toBe(1);
  });

  it('4배속에서도 같은 시뮬레이션 6초와 효과 수명을 사용한다', async () => {
    const physics = new FakePhysics();
    const engine = createEngine(physics, { skillsEnabled: true, random: () => 0 });
    await engine.init();
    engine.setFastForward(true);

    advanceSteps(engine, 149);
    expect(physics.impacted).toEqual([]);
    engine.advance(10);
    expect(physics.impacted).toEqual(['b:0']);
    expect(engine.snapshot().skillEffects[0].elapsedMs).toBe(0);
    advanceSteps(engine, 12);
    engine.advance(4);
    expect(engine.snapshot().skillEffects[0].elapsedMs).toBe(490);
    engine.advance(1);
    expect(engine.snapshot().skillEffects).toEqual([]);
  });

  it('destroy는 효과를 비우고 이후 발동을 중지한다', async () => {
    const physics = new FakePhysics();
    const random = vi.fn<RandomSource>(() => 0);
    const engine = createEngine(physics, { skillsEnabled: true, random });
    await engine.init();
    advanceSteps(engine, 600);
    expect(engine.snapshot().skillEffects).toHaveLength(1);

    engine.destroy();
    advanceSteps(engine, 800);

    expect(engine.snapshot().skillEffects).toEqual([]);
    expect(random).toHaveBeenCalledTimes(3);
    expect(physics.impacted).toEqual(['b:0']);
  });

  it('스킬을 끄면 RNG를 소비하지 않고 impact도 발생하지 않는다', async () => {
    const physics = new FakePhysics();
    const random = vi.fn<RandomSource>().mockReturnValue(0);
    const engine = createEngine(physics, { skillsEnabled: false, random });
    await engine.init();

    advanceSteps(engine, 1_000);

    expect(random).not.toHaveBeenCalled();
    expect(physics.impacted).toEqual([]);
    expect(engine.snapshot().skillEffects).toEqual([]);
    expect(engine.snapshot().skillActivationCount).toBe(0);
  });

  it('3초간 이동하지 않은 active 구슬을 흔든 뒤 tracker를 초기화한다', async () => {
    const physics = new FakePhysics();
    const engine = createEngine(physics);
    await engine.init();

    advanceSteps(engine, 300);
    expect(physics.shaken).toEqual(['b:0', 'a:0', 'c:0']);

    advanceSteps(engine, 299);
    expect(physics.shaken).toHaveLength(3);
    advanceSteps(engine, 1);
    expect(physics.shaken).toEqual(['b:0', 'a:0', 'c:0', 'b:0', 'a:0', 'c:0']);
  });

  it('이미 도착한 ID에는 skill과 shake를 적용하지 않는다', async () => {
    const physics = new FakePhysics();
    physics.onStep = (step, current) => {
      if (step === 600) {
        Object.assign(current.marbles.get('b:0')!, { x: GOAL_CENTER_X, y: NOTME_COURSE.goalY });
      }
    };
    const engine = createEngine(physics, { skillsEnabled: true, random: () => 0 });
    await engine.init();

    advanceSteps(engine, 600);

    expect(physics.impacted).toEqual(['a:0']);
    expect(physics.shaken.filter((id) => id === 'b:0')).toHaveLength(1);
  });
});

describe('RouletteEngine snapshot과 수명', () => {
  it('adapter가 객체를 재사용해도 snapshot 변경을 body와 동적 장애물에 전파하지 않는다', async () => {
    const physics = new ReusingSnapshotPhysics();
    physics.dynamicObstacles = [{
      id: 'spinner:test',
      kind: 'spinner',
      center: { x: 13, y: 56 },
      length: 9,
      angle: 1.5,
    }];
    const engine = createEngine(physics);
    await engine.init();

    const first = engine.snapshot();
    first.active[0].body.x = 999;
    first.dynamicObstacles[0].angle = 999;
    first.dynamicObstacles[0].center.x = 999;

    expect(physics.getMarble('b:0')).toEqual({
      id: 'b:0',
      x: 10.25,
      y: 1,
      angle: 0,
      radius: 0.25,
    });
    expect(physics.getDynamicObstacles()[0]).toEqual({
      id: 'spinner:test',
      kind: 'spinner',
      center: { x: 13, y: 56 },
      length: 9,
      angle: 1.5,
    });
    expect(engine.snapshot().active[0].body.x).toBe(10.25);
    expect(engine.snapshot().dynamicObstacles[0]).toMatchObject({
      center: { x: 13, y: 56 },
      angle: 1.5,
    });
  });

  it('active에 seed metadata와 body를, snapshot에 winnerMode와 동적 장애물을 포함한다', async () => {
    const physics = new FakePhysics();
    physics.dynamicObstacles = [{
      id: 'spinner:test',
      kind: 'spinner',
      center: { x: 13, y: 56 },
      length: 9,
      angle: 1.5,
    }];
    const engine = createEngine(physics, { winnerMode: 'first' });
    await engine.init();

    const snapshot = engine.snapshot();
    expect(snapshot.active).toHaveLength(3);
    expect(snapshot.active[0]).toMatchObject({
      id: 'b:0',
      participantId: 'b',
      name: '철수',
      body: { id: 'b:0', angle: 0, radius: 0.25 },
    });
    expect(snapshot).toMatchObject({
      dynamicObstacles: physics.dynamicObstacles,
      skillEffects: [],
      skillActivationCount: 0,
      winnerMode: 'first',
      speed: 1,
      finishOrder: [],
      winner: null,
    });
  });

  it('100개 구슬을 첫 통로 안의 겹치지 않는 10열로 배치한다', async () => {
    const hundredSeeds = Array.from({ length: 100 }, (_, index): MarbleSeed => ({
      id: `a:${index}`,
      participantId: 'a',
      name: '짱구',
    }));
    const physics = new FakePhysics();
    const engine = createEngine(physics, { marbles: hundredSeeds });
    await engine.init();

    expect(physics.created).toHaveLength(100);
    for (const [index, marble] of physics.created.entries()) {
      expect(marble.x).toBeCloseTo(10.25 + index % 10 * 0.6, 5);
      expect(marble.y).toBeCloseTo(1 + Math.floor(index / 10) * 0.6, 5);
      expect(marble.x).toBeGreaterThanOrEqual(10.25);
      expect(marble.x).toBeLessThanOrEqual(15.65);
      expect(marble.y).toBeGreaterThanOrEqual(0.25);
      expect(marble.y).toBeLessThanOrEqual(8.25);
    }
    for (let left = 0; left < physics.created.length; left += 1) {
      for (let right = left + 1; right < physics.created.length; right += 1) {
        const first = physics.created[left];
        const second = physics.created[right];
        expect(Math.hypot(first.x - second.x, first.y - second.y)).toBeGreaterThanOrEqual(0.5);
      }
    }
  });

  it('init 대기 중 destroy해도 코스와 구슬을 생성하지 않고 physics를 한 번만 정리한다', async () => {
    let resolveInit!: () => void;
    const physics = new FakePhysics();
    physics.init = () => new Promise<void>((resolve) => {
      resolveInit = resolve;
    });
    const engine = createEngine(physics);

    const initializing = engine.init();
    engine.destroy();
    engine.destroy();
    resolveInit();
    expect(await initializing).toBe(false);

    expect(physics.destroyCount).toBe(1);
    expect(physics.createdCourse).toBeNull();
    expect(physics.created).toEqual([]);
  });

  it('일반 destroy에서도 physics 소유 자원을 한 번만 정리한다', async () => {
    const physics = new FakePhysics();
    const engine = createEngine(physics);
    expect(await engine.init()).toBe(true);

    engine.destroy();
    engine.destroy();

    expect(physics.destroyCount).toBe(1);
  });
});
