// @vitest-environment node

import { afterEach, describe, expect, it, vi } from 'vitest';

type Deferred<Value> = {
  promise: Promise<Value>;
  resolve(value: Value): void;
};

function createDeferred<Value>(): Deferred<Value> {
  let resolve!: (value: Value) => void;
  const promise = new Promise<Value>((next) => {
    resolve = next;
  });
  return { promise, resolve };
}

function createBox2dModule() {
  class FakeVec2 {
    constructor(_x: number, _y: number) {}
  }

  class FakeWorld {
    destroyed = false;

    constructor(_gravity: FakeVec2) {
      worlds.push(this);
    }
  }

  const worlds: FakeWorld[] = [];
  return {
    module: {
      b2Vec2: FakeVec2,
      b2World: FakeWorld,
      destroy(instance: FakeVec2 | FakeWorld) {
        if (instance instanceof FakeWorld) instance.destroyed = true;
      },
    },
    worlds,
  };
}

afterEach(() => {
  vi.doUnmock('box2d-wasm');
  vi.resetModules();
});

describe('Box2dPhysics 초기화 수명', () => {
  it('동시 init은 world 하나만 만들고 destroy 뒤 다시 초기화한다', async () => {
    const { module, worlds } = createBox2dModule();
    vi.doMock('box2d-wasm', () => ({ default: vi.fn(async () => module) }));
    const { Box2dPhysics } = await import('./Box2dPhysics');
    const physics = new Box2dPhysics();

    await Promise.all([physics.init(), physics.init()]);

    expect(worlds).toHaveLength(1);
    physics.destroy();
    expect(worlds[0].destroyed).toBe(true);

    await physics.init();
    expect(worlds).toHaveLength(2);
  });

  it('대기 중인 init을 destroy하면 생성된 world를 게시하지 않고 정리한다', async () => {
    const { module, worlds } = createBox2dModule();
    const deferredModule = createDeferred<typeof module>();
    vi.doMock('box2d-wasm', () => ({ default: vi.fn(() => deferredModule.promise) }));
    const { Box2dPhysics } = await import('./Box2dPhysics');
    const physics = new Box2dPhysics();

    const initializing = physics.init();
    physics.destroy();
    deferredModule.resolve(module);
    await initializing;

    expect(worlds).toHaveLength(1);
    expect(worlds[0].destroyed).toBe(true);
    expect((physics as unknown as { world: unknown }).world).toBeNull();

    await physics.init();
    expect(worlds).toHaveLength(2);
  });
});
