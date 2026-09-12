// @vitest-environment node

import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import { Box2dPhysics } from './Box2dPhysics';
import { RouletteEngine } from './RouletteEngine';

beforeEach(() => {
  // Node 로더가 로컬 WASM 경로를 fetch URL로 오인하지 않도록 한다.
  vi.stubGlobal('fetch', undefined);
});

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
