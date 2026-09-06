import { describe, expect, it } from 'vitest';

import {
  createStopwatchGame,
  isStopwatchDraft,
  stopwatchReducer,
  type StopwatchState,
} from './stopwatchMachine';

function recordDigits(state: StopwatchState, digits: number[]): StopwatchState {
  return digits.reduce((current, digit, index) => {
    const startedAt = index * 100;
    const running = stopwatchReducer(current, { type: 'start', now: startedAt });
    return stopwatchReducer(running, { type: 'stop', now: startedAt + digit * 10 });
  }, state);
}

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

  it('1라운드 동점자 재대결에서 단독 최저점이 나오면 result로 전이한다', () => {
    let state = createStopwatchGame(['짱구', '철수', '유리']);
    const [jjanggu, cheolsu] = state.players.map(({ id }) => id);

    state = recordDigits(state, [1, 1, 1, 1, 3, 4]);
    expect(state.roundPlayerIds).toEqual([jjanggu, cheolsu]);
    expect(state.round).toBe(2);

    state = recordDigits(state, [3, 4, 4, 5]);

    expect(state.phase).toBe('result');
    expect(state.roundPlayerIds).toEqual([jjanggu, cheolsu]);
    expect(state.players.find(({ id }) => id === jjanggu)?.score).toBe(12);
    expect(state.players.find(({ id }) => id === cheolsu)?.score).toBe(20);
    expect(isStopwatchDraft(state)).toBe(true);
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
  it('playing, result, draw 상태를 draft로 판별한다', () => {
    const playing = createStopwatchGame(['짱구', '철수']);
    const [jjanggu, cheolsu] = playing.players;
    const result = {
      ...playing,
      phase: 'result' as const,
      players: [
        { ...jjanggu, attempts: [1, 2], score: 2 },
        { ...cheolsu, attempts: [3, 4], score: 12 },
      ],
      currentPlayerIndex: 1,
    };
    const draw = {
      ...createStopwatchGame(['짱구', '철수', '유리']),
      players: [
        { id: 'player-0', name: '짱구', attempts: [], score: null },
        { id: 'player-1', name: '철수', attempts: [], score: null },
        { id: 'player-2', name: '유리', attempts: [3, 4], score: 12 },
      ],
      roundPlayerIds: ['player-0', 'player-1'],
      round: 2,
    };

    expect(isStopwatchDraft(playing)).toBe(true);
    expect(isStopwatchDraft(result)).toBe(true);
    expect(isStopwatchDraft(draw)).toBe(true);
  });

  it('실행 중 startedAt이 저장된 draft를 거부한다', () => {
    const state = createStopwatchGame(['짱구', '철수']);

    expect(isStopwatchDraft({ ...state, startedAt: 1234 })).toBe(false);
  });

  it('현재 라운드의 최저점이 동점인 result draft를 거부한다', () => {
    const state = createStopwatchGame(['짱구', '철수']);
    const tiedResult = {
      ...state,
      phase: 'result' as const,
      players: [
        { ...state.players[0], attempts: [1, 2], score: 2 },
        { ...state.players[1], attempts: [1, 2], score: 2 },
      ],
      currentPlayerIndex: 1,
    };

    expect(isStopwatchDraft(tiedResult)).toBe(false);
  });

  it.each([
    ['참가자가 한 명뿐인 상태', () => {
      const state = createStopwatchGame(['짱구', '철수']);
      return { ...state, players: [state.players[0]], roundPlayerIds: [state.players[0].id] };
    }],
    ['중복 참가자 ID', () => {
      const state = createStopwatchGame(['짱구', '철수']);
      return { ...state, players: [{ ...state.players[0] }, { ...state.players[1], id: state.players[0].id }] };
    }],
    ['존재하지 않는 라운드 참가자', () => {
      const state = createStopwatchGame(['짱구', '철수']);
      return { ...state, roundPlayerIds: [state.players[0].id, 'missing'] };
    }],
    ['중복 라운드 참가자', () => {
      const state = createStopwatchGame(['짱구', '철수']);
      return { ...state, roundPlayerIds: [state.players[0].id, state.players[0].id] };
    }],
    ['범위를 벗어난 현재 참가자 인덱스', () => {
      const state = createStopwatchGame(['짱구', '철수']);
      return { ...state, currentPlayerIndex: 2 };
    }],
    ['현재 라운드에 없는 현재 참가자', () => {
      const state = createStopwatchGame(['짱구', '철수', '유리']);
      return { ...state, roundPlayerIds: [state.players[0].id, state.players[2].id], currentPlayerIndex: 1 };
    }],
    ['범위를 벗어난 측정 숫자', () => {
      const state = createStopwatchGame(['짱구', '철수']);
      return { ...state, players: [{ ...state.players[0], attempts: [10] }, state.players[1]] };
    }],
    ['측정값과 일치하지 않는 점수', () => {
      const state = createStopwatchGame(['짱구', '철수']);
      return {
        ...state,
        players: [
          { ...state.players[0], attempts: [4, 9], score: 35 },
          state.players[1],
        ],
        currentPlayerIndex: 1,
      };
    }],
  ])('%s은 draft로 판별하지 않는다', (_description, createInvalidDraft) => {
    expect(isStopwatchDraft(createInvalidDraft())).toBe(false);
  });

  it('필수 필드가 없는 값과 null을 draft로 판별하지 않는다', () => {
    expect(isStopwatchDraft({ phase: 'playing', players: [] })).toBe(false);
    expect(isStopwatchDraft(null)).toBe(false);
  });
});
