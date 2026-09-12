import { describe, expect, it } from 'vitest';

import { createFingerDrawGame, fingerDrawReducer, pickFingerId } from './fingerDrawMachine';

describe('fingerDrawReducer', () => {
  it('두 번째 손가락에서 3초 카운트다운을 시작한다', () => {
    const first = fingerDrawReducer(createFingerDrawGame(), {
      type: 'touch-start', id: 1, x: 10, y: 20, now: 100,
    });
    const state = fingerDrawReducer(first, {
      type: 'touch-start', id: 2, x: 30, y: 40, now: 200,
    });

    expect(state).toMatchObject({
      phase: 'countdown',
      countdownStartedAt: 200,
      countdownReason: 'initial',
    });
    expect(state.fingers).toHaveLength(2);
  });

  it('카운트다운 중 참가자 제거는 새 3초 카운트다운으로 바꾼다', () => {
    let state = createFingerDrawGame();
    for (const id of [1, 2, 3]) {
      state = fingerDrawReducer(state, { type: 'touch-start', id, x: id, y: id, now: id * 100 });
    }

    state = fingerDrawReducer(state, { type: 'touch-end', id: 3, now: 900 });

    expect(state).toMatchObject({
      phase: 'countdown',
      countdownStartedAt: 900,
      countdownReason: 'changed',
    });
    expect(state.fingers.map(({ id }) => id)).toEqual([1, 2]);
  });

  it('한 명만 남으면 대기로 돌아간다', () => {
    let state = createFingerDrawGame();
    state = fingerDrawReducer(state, { type: 'touch-start', id: 1, x: 10, y: 10, now: 1 });
    state = fingerDrawReducer(state, { type: 'touch-start', id: 2, x: 20, y: 20, now: 2 });

    state = fingerDrawReducer(state, { type: 'touch-end', id: 2, now: 3 });

    expect(state).toMatchObject({ phase: 'waiting', countdownStartedAt: null, countdownReason: null });
    expect(state.fingers.map(({ id }) => id)).toEqual([1]);
  });

  it('손가락 이동은 색을 유지하고 카운트다운을 다시 시작하지 않는다', () => {
    let state = createFingerDrawGame();
    state = fingerDrawReducer(state, { type: 'touch-start', id: 1, x: 10, y: 20, now: 100 });
    state = fingerDrawReducer(state, { type: 'touch-start', id: 2, x: 30, y: 40, now: 200 });
    const version = state.countdownVersion;
    const color = state.fingers[0]!.color;

    state = fingerDrawReducer(state, { type: 'touch-move', id: 1, x: 70, y: 80 });

    expect(state.countdownVersion).toBe(version);
    expect(state.fingers[0]).toMatchObject({ id: 1, x: 70, y: 80, color });
  });

  it('열 번째 뒤의 손가락은 등록하거나 카운트다운을 바꾸지 않는다', () => {
    let state = createFingerDrawGame();
    for (let id = 1; id <= 10; id += 1) {
      state = fingerDrawReducer(state, { type: 'touch-start', id, x: id, y: id, now: id });
    }

    const unchanged = fingerDrawReducer(state, { type: 'touch-start', id: 11, x: 11, y: 11, now: 99 });

    expect(unchanged).toBe(state);
  });

  it('현재 카운트다운 버전으로 완료되면 한 손가락을 선택한다', () => {
    let state = createFingerDrawGame();
    state = fingerDrawReducer(state, { type: 'touch-start', id: 1, x: 10, y: 20, now: 100 });
    state = fingerDrawReducer(state, { type: 'touch-start', id: 2, x: 30, y: 40, now: 200 });

    state = fingerDrawReducer(state, { type: 'resolve', version: state.countdownVersion, selectedId: 2 });

    expect(state).toMatchObject({ phase: 'result', selectedId: 2, countdownStartedAt: null });
  });

  it('이전 카운트다운 완료와 결과 뒤 포인터 변경을 무시한다', () => {
    let state = createFingerDrawGame();
    state = fingerDrawReducer(state, { type: 'touch-start', id: 1, x: 10, y: 20, now: 100 });
    state = fingerDrawReducer(state, { type: 'touch-start', id: 2, x: 30, y: 40, now: 200 });
    const oldVersion = state.countdownVersion;
    state = fingerDrawReducer(state, { type: 'touch-start', id: 3, x: 50, y: 60, now: 300 });

    expect(fingerDrawReducer(state, { type: 'resolve', version: oldVersion, selectedId: 1 })).toBe(state);

    const result = fingerDrawReducer(state, { type: 'resolve', version: state.countdownVersion, selectedId: 1 });
    expect(fingerDrawReducer(result, { type: 'touch-end', id: 1, now: 400 })).toBe(result);
  });

  it('다시 하기는 모든 손가락과 결과를 지운다', () => {
    let state = createFingerDrawGame();
    state = fingerDrawReducer(state, { type: 'touch-start', id: 1, x: 10, y: 20, now: 100 });
    state = fingerDrawReducer(state, { type: 'touch-start', id: 2, x: 30, y: 40, now: 200 });
    state = fingerDrawReducer(state, { type: 'resolve', version: state.countdownVersion, selectedId: 1 });

    expect(fingerDrawReducer(state, { type: 'reset' })).toEqual(createFingerDrawGame());
  });

  it('주입한 난수로 선택할 손가락을 결정한다', () => {
    expect(pickFingerId([10, 20, 30], () => 0.66)).toBe(20);
  });
});
