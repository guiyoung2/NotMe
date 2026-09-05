import { describe, expect, it } from 'vitest';

import {
  lastHundredthDigit,
  lowestPlayerIds,
  multiplyDigits,
} from './stopwatchRules';

describe('lastHundredthDigit', () => {
  it.each([[0, 0], [47, 4], [1299, 9], [12345, 4]])('%dms의 마지막 숫자는 %d다', (ms, digit) => {
    expect(lastHundredthDigit(ms)).toBe(digit);
  });
});

it('두 자리 숫자를 곱한다', () => {
  expect(multiplyDigits([4, 9])).toBe(36);
});

it('최저 점수 동점자만 반환한다', () => {
  expect(lowestPlayerIds([
    { id: 'a', score: 12 }, { id: 'b', score: 4 }, { id: 'c', score: 4 },
  ])).toEqual(['b', 'c']);
});
