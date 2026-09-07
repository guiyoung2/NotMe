import { describe, expect, it } from 'vitest';

import {
  expandMarbles,
  shuffleMarbles,
  validateMarbleParticipants,
} from './marbleConfig';

describe('validateMarbleParticipants', () => {
  it('두 명 이상이고 각자 한 개 이상이면 시작할 수 있다', () => {
    expect(validateMarbleParticipants([
      { id: 'a', name: '짱구', count: 2 },
      { id: 'b', name: '철수', count: 1 },
    ])).toEqual({ valid: true, total: 3 });
  });

  it('참가자가 한 명이면 시작할 수 없다', () => {
    expect(validateMarbleParticipants([
      { id: 'a', name: '짱구', count: 2 },
    ]).valid).toBe(false);
  });

  it('공백만 있는 이름이면 시작할 수 없다', () => {
    expect(validateMarbleParticipants([
      { id: 'a', name: '  ', count: 1 },
      { id: 'b', name: '철수', count: 1 },
    ]).valid).toBe(false);
  });

  it.each([0, -1, 1.5, 101])('%s개 구슬은 참가자에게 배정할 수 없다', (count) => {
    expect(validateMarbleParticipants([
      { id: 'a', name: '짱구', count },
      { id: 'b', name: '철수', count: 1 },
    ]).valid).toBe(false);
  });

  it('전체 101개는 시작할 수 없다', () => {
    const result = validateMarbleParticipants([{ id: 'a', name: '짱구', count: 101 }]);

    expect(result).toEqual({ valid: false, total: 101, overBy: 1 });
  });

  it('각자 허용된 개수여도 전체 101개면 시작할 수 없다', () => {
    expect(validateMarbleParticipants([
      { id: 'a', name: '짱구', count: 50 },
      { id: 'b', name: '철수', count: 51 },
    ])).toEqual({ valid: false, total: 101, overBy: 1 });
  });

  it('전체 구슬 수가 두 개 미만이면 시작할 수 없다', () => {
    expect(validateMarbleParticipants([
      { id: 'a', name: '짱구', count: 0 },
      { id: 'b', name: '철수', count: 1 },
    ]).valid).toBe(false);
  });
});

it('참가자별 개수만큼 동일 속성의 구슬을 만든다', () => {
  expect(expandMarbles([
    { id: 'a', name: '짱구', count: 2 },
    { id: 'b', name: '철수', count: 1 },
  ])).toEqual([
    { id: 'a:0', participantId: 'a', name: '짱구' },
    { id: 'a:1', participantId: 'a', name: '짱구' },
    { id: 'b:0', participantId: 'b', name: '철수' },
  ]);
});

it('주입된 난수로 Fisher-Yates 순서로 구슬을 섞는다', () => {
  const marbles = [
    { id: 'a:0', participantId: 'a', name: '짱구' },
    { id: 'b:0', participantId: 'b', name: '철수' },
    { id: 'c:0', participantId: 'c', name: '유리' },
    { id: 'd:0', participantId: 'd', name: '맹구' },
  ];

  expect(shuffleMarbles(marbles, () => 0)).toEqual([
    { id: 'b:0', participantId: 'b', name: '철수' },
    { id: 'c:0', participantId: 'c', name: '유리' },
    { id: 'd:0', participantId: 'd', name: '맹구' },
    { id: 'a:0', participantId: 'a', name: '짱구' },
  ]);
});

it('구슬을 섞어도 입력 배열을 바꾸지 않는다', () => {
  const marbles = [
    { id: 'a:0', participantId: 'a', name: '짱구' },
    { id: 'b:0', participantId: 'b', name: '철수' },
  ];

  shuffleMarbles(marbles, () => 0);

  expect(marbles).toEqual([
    { id: 'a:0', participantId: 'a', name: '짱구' },
    { id: 'b:0', participantId: 'b', name: '철수' },
  ]);
});
