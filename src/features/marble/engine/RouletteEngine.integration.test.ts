// @vitest-environment node

import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import { Box2dPhysics } from './Box2dPhysics';
import { RouletteEngine } from './RouletteEngine';
import type { BodySnapshot } from './types';

beforeEach(() => {
  // Node 로더가 로컬 WASM 경로를 fetch URL로 오인하지 않도록 한다.
  vi.stubGlobal('fetch', undefined);
});

async function runHundredMarbles(seed: number, skillsEnabled: boolean) {
  let state = seed;
  const random = () => ((state = (Math.imul(state, 1664525) + 1013904223) >>> 0) / 4294967296);
  const physics = new Box2dPhysics(random);
  const marbles = Array.from({ length: 100 }, (_, index) => ({
    id: String(index), participantId: String(index % 5), name: `참가자 ${index % 5}`,
  }));
  const engine = new RouletteEngine({ physics, marbles, winnerMode: 'last', skillsEnabled, random });
  const previous = new Map<string, BodySnapshot>();
  const crossings = new Set<string>();
  const escaped: BodySnapshot[] = [];
  let steps = 0;
  const stepPhysics = physics.step.bind(physics);
  physics.step = (seconds) => {
    for (const { id } of marbles) {
      const body = physics.getMarble(id);
      if (body) {
        if (body.x < 0 || body.x > 26 || body.y < 0) escaped.push(body);
        previous.set(id, body);
      }
    }
    stepPhysics(seconds);
  };
  const remove = physics.removeMarble.bind(physics);
  physics.removeMarble = (id) => {
    const body = physics.getMarble(id);
    if (body) {
      const before = previous.get(id)!;
      expect(before.y).toBeLessThan(120);
      expect(body.y).toBeGreaterThanOrEqual(120);
      expect(body.x).toBeGreaterThanOrEqual(0);
      expect(body.x).toBeLessThanOrEqual(26);
      const crossingX = before.x + (body.x - before.x) * (120 - before.y) / (body.y - before.y);
      expect(crossingX).toBeGreaterThanOrEqual(0.25);
      expect(crossingX).toBeLessThanOrEqual(25.75);
      crossings.add(id);
    }
    remove(id);
  };
  try {
    await engine.init();
    for (; steps < 12000 && crossings.size < 100; steps += 1) engine.advance(10);
    expect(crossings.size).toBe(100);
    expect(escaped).toEqual([]);
    expect(engine.snapshot().finishOrder).toHaveLength(100);
    expect(engine.snapshot().active).toEqual([]);
    const snapshot = engine.snapshot();
    if (skillsEnabled) {
      expect(snapshot.skillActivationCount).toBeGreaterThan(0);
    } else {
      expect(snapshot.skillActivationCount).toBe(0);
      expect(snapshot.skillEffects).toEqual([]);
    }
    return {
      finishOrder: snapshot.finishOrder,
      simulatedMs: steps * 10,
      skillActivationCount: snapshot.skillActivationCount,
    };
  } finally {
    engine.destroy();
  }
}

it.each([1, 2, 3, 4, 5])('실제 100구슬이 시드 %i에서 120초 안에 유효하게 완주하며 반복 순위가 같다', async (seed) => {
  for (const skillsEnabled of [false, true]) {
    const first = await runHundredMarbles(seed, skillsEnabled);
    const repeated = await runHundredMarbles(seed, skillsEnabled);
    expect(repeated).toEqual(first);
  }
}, 10000);

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

it('시작 중앙의 세 구슬이 흔들기 없이 첫 램프 구간을 10초 안에 벗어난다', async () => {
  const physics = new Box2dPhysics(() => 0.5);
  const engine = new RouletteEngine({
    physics,
    marbles: Array.from({ length: 3 }, (_, index) => ({
      id: String(index), participantId: String(index), name: String(index),
    })),
    winnerMode: 'last', skillsEnabled: false, random: () => 0.5,
  });
  const shake = vi.spyOn(physics, 'shakeMarble');
  try {
    await engine.init();
    for (let step = 0; step < 1000; step += 1) engine.advance(10);

    expect(engine.snapshot().active).toHaveLength(3);
    for (const { body } of engine.snapshot().active) expect(body.y).toBeGreaterThan(28);
    expect(shake).not.toHaveBeenCalled();
  } finally {
    engine.destroy();
  }
});
