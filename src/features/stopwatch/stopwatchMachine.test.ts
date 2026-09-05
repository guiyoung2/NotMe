import { describe, expect, it } from 'vitest';

import {
  createStopwatchGame,
  isStopwatchDraft,
  stopwatchReducer,
} from './stopwatchMachine';

describe('stopwatchReducer', () => {
  it('두 번 측정하면 다음 참가자로 이동한다', () => {
    let state = createStopwatchGame(['짱구', '철수']);
    state = stopwatchReducer(state, { type: 'start', now: 1000 });
    state = stopwatchReducer(state, { type: 'stop', now: 1047 });
    state = stopwatchReducer(state, { type: 'start', now: 2000 });
    state = stopwatchReducer(state, { type: 'stop', now: 2099 });

    expect(state.players[0].attempts).toEqual([4, 9]);
    expect(state.players[0].score).toBe(36);
    expect(state.currentPlayerIndex).toBe(1);
  });

  it('동점이면 동점자만 다음 라운드로 보내고 측정 기록을 비운다', () => {
    let state = createStopwatchGame(['짱구', '철수', '유리']);
    const [jjanggu, cheolsu, yuri] = state.players.map(({ id }) => id);

    state = stopwatchReducer(state, { type: 'start', now: 0 });
    state = stopwatchReducer(state, { type: 'stop', now: 10 });
    state = stopwatchReducer(state, { type: 'start', now: 100 });
    state = stopwatchReducer(state, { type: 'stop', now: 120 });
    state = stopwatchReducer(state, { type: 'start', now: 200 });
    state = stopwatchReducer(state, { type: 'stop', now: 210 });
    state = stopwatchReducer(state, { type: 'start', now: 300 });
    state = stopwatchReducer(state, { type: 'stop', now: 320 });
    state = stopwatchReducer(state, { type: 'start', now: 400 });
    state = stopwatchReducer(state, { type: 'stop', now: 430 });
    state = stopwatchReducer(state, { type: 'start', now: 500 });
    state = stopwatchReducer(state, { type: 'stop', now: 540 });

    expect(state.phase).toBe('playing');
    expect(state.roundPlayerIds).toEqual([jjanggu, cheolsu]);
    expect(state.round).toBe(2);
    expect(state.players).toEqual([
      { id: jjanggu, name: '짱구', attempts: [], score: null },
      { id: cheolsu, name: '철수', attempts: [], score: null },
      { id: yuri, name: '유리', attempts: [3, 4], score: 12 },
    ]);
    expect(state.currentPlayerIndex).toBe(0);
  });

  it('진행 중 측정을 무효화하면 시작 시각만 제거한다', () => {
    let state = createStopwatchGame(['짱구']);
    state = stopwatchReducer(state, { type: 'start', now: 1000 });
    state = stopwatchReducer(state, { type: 'invalidate-running-attempt' });

    expect(state.startedAt).toBeNull();
    expect(state.players[0].attempts).toEqual([]);
    expect(state.currentPlayerIndex).toBe(0);
  });
});

describe('isStopwatchDraft', () => {
  it('유효한 스톱워치 상태만 draft로 판별한다', () => {
    expect(isStopwatchDraft(createStopwatchGame(['짱구']))).toBe(true);
    expect(isStopwatchDraft({ phase: 'playing', players: [] })).toBe(false);
    expect(isStopwatchDraft(null)).toBe(false);
  });
});
