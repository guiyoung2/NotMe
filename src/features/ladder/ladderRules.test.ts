import { describe, expect, it } from 'vitest';

import {
  generateLadder,
  shuffleWith,
  traceLadder,
} from './ladderRules';

function seededRandom(seed: number): () => number {
  let value = seed;
  return () => {
    value = (value * 16807) % 2147483647;
    return (value - 1) / 2147483646;
  };
}

describe('generateLadder', () => {
  it('최소 열 수인 두 열로 사다리를 생성한다', () => {
    const ladder = generateLadder(2, () => 0.2);

    expect(ladder).toEqual({
      columnCount: 2,
      rows: Array.from({ length: 6 }, () => [0]),
    });
  });

  it.each([1, 0, -1, 2.5])('%d열 입력을 거절한다', (columnCount) => {
    expect(() => generateLadder(columnCount, () => 0.2)).toThrow(
      'columnCount must be an integer of at least 2',
    );
  });

  it('한 행에 인접하거나 겹치는 가로선을 만들지 않는다', () => {
    const ladder = generateLadder(6, () => 0.2);

    for (const row of ladder.rows) {
      expect(row.every((left, index) => index === 0 || left - row[index - 1] > 1)).toBe(true);
    }
  });

  it('모든 시작점은 서로 다른 도착점에 연결된다', () => {
    const ladder = generateLadder(8, seededRandom(17));
    const ends = Array.from({ length: 8 }, (_, start) => traceLadder(ladder, start).end);

    expect(new Set(ends).size).toBe(8);
  });
});

it('경로의 행과 열 지점 및 도착점을 추적한다', () => {
  const trace = traceLadder({ columnCount: 4, rows: [[0], [1], [2]] }, 0);

  expect(trace).toEqual({
    end: 3,
    points: [
      { row: 0, column: 0 },
      { row: 1, column: 0 },
      { row: 1, column: 1 },
      { row: 2, column: 1 },
      { row: 2, column: 2 },
      { row: 3, column: 2 },
      { row: 3, column: 3 },
    ],
  });
});

it('Fisher-Yates 방식으로 복사본을 섞고 입력은 바꾸지 않는다', () => {
  const values = ['a', 'b', 'c', 'd'];

  expect(shuffleWith(values, () => 0)).toEqual(['b', 'c', 'd', 'a']);
  expect(values).toEqual(['a', 'b', 'c', 'd']);
});
