import { describe, expect, it, vi } from 'vitest';

import { SkillSystem } from './SkillSystem';

describe('SkillSystem', () => {
  it('6초 뒤 활성 구슬 중 하나를 동일한 index 규칙으로 선택한다', () => {
    const values = [0, 0.5, 1];
    const system = new SkillSystem(() => values.shift()!);

    expect(system.update(['a', 'b', 'c'], 5_990)).toBeNull();
    expect(system.update(['a', 'b', 'c'], 10)).toBe('b');
    expect(system.update(['a', 'b', 'c'], 7_990)).toBeNull();
  });

  it.each([
    { value: 0, expected: 'a' },
    { value: 0.34, expected: 'b' },
    { value: 0.67, expected: 'c' },
    { value: 1, expected: 'c' },
  ])('난수 $value 로 활성 배열의 $expected 를 선택한다', ({ value, expected }) => {
    const values = [1, value, 0];
    const system = new SkillSystem(() => values.shift()!);

    expect(system.update(['a', 'b', 'c'], 7_990)).toBeNull();
    expect(system.update(['a', 'b', 'c'], 10)).toBe(expected);
  });

  it('빈 ID에서는 난수와 예약 시간을 소비하지 않는다', () => {
    const random = vi.fn(() => 0);
    const system = new SkillSystem(random);

    expect(system.update([], 10_000)).toBeNull();
    expect(random).not.toHaveBeenCalled();
    expect(system.update(['a'], 5_990)).toBeNull();
    expect(system.update([], 10_000)).toBeNull();
    expect(random).toHaveBeenCalledTimes(1);
    expect(system.update(['a'], 10)).toBe('a');
  });

  it('clear 뒤 첫 활성 update에서 새 간격을 예약한다', () => {
    const values = [0, 1, 0.5, 0];
    const random = vi.fn(() => values.shift()!);
    const system = new SkillSystem(random);
    system.update(['a', 'b'], 5_990);

    system.clear();

    expect(random).toHaveBeenCalledTimes(1);
    expect(system.update(['a', 'b'], 7_990)).toBeNull();
    expect(system.update(['a', 'b'], 10)).toBe('b');
  });
});
