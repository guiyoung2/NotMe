// @vitest-environment node

import { describe, expect, it } from 'vitest';

import { NOTME_COURSE, validateCourse } from './course';

describe('NOTME_COURSE', () => {
  it('다섯 구간과 유효한 골인선을 가진다', () => {
    expect(NOTME_COURSE.width).toBe(26);
    expect(NOTME_COURSE.viewportHeight).toBe(24);
    expect(NOTME_COURSE.goalY).toBe(120);
    expect(NOTME_COURSE.sections.map(({ kind }) => kind)).toEqual([
      'ramps',
      'pins',
      'spinner',
      'fork',
      'finish',
    ]);
    expect(validateCourse(NOTME_COURSE)).toEqual([]);
    expect(NOTME_COURSE.goalY).toBeGreaterThan(NOTME_COURSE.viewportHeight * 4);
    expect(NOTME_COURSE.goalSensor.from.y).toBe(NOTME_COURSE.goalY);
    expect(NOTME_COURSE.goalSensor.to.y).toBe(NOTME_COURSE.goalY);
  });

  it('시작 지점부터 골인까지 양쪽 외벽이 이어진다', () => {
    expect(NOTME_COURSE.walls).toEqual(expect.arrayContaining([
      {
        kind: 'line',
        from: { x: 0, y: 0 },
        to: { x: 0, y: NOTME_COURSE.goalY },
      },
      {
        kind: 'line',
        from: { x: NOTME_COURSE.width, y: 0 },
        to: { x: NOTME_COURSE.width, y: NOTME_COURSE.goalY },
      },
    ]));
  });

  it('모든 벽과 장애물의 물리 형상이 코스 경계 안에 있다', () => {
    const obstacles = [
      ...NOTME_COURSE.walls,
      ...NOTME_COURSE.sections.flatMap(({ obstacles: sectionObstacles }) => sectionObstacles),
    ];

    for (const obstacle of obstacles) {
      if (obstacle.kind === 'line') {
        for (const point of [obstacle.from, obstacle.to]) {
          expect(point.x).toBeGreaterThanOrEqual(0);
          expect(point.x).toBeLessThanOrEqual(NOTME_COURSE.width);
          expect(point.y).toBeGreaterThanOrEqual(0);
          expect(point.y).toBeLessThanOrEqual(NOTME_COURSE.goalY);
        }
        expect(Math.hypot(obstacle.to.x - obstacle.from.x, obstacle.to.y - obstacle.from.y)).toBeGreaterThan(0);
      }

      if (obstacle.kind === 'circle') {
        expect(obstacle.center.x - obstacle.radius).toBeGreaterThanOrEqual(0);
        expect(obstacle.center.x + obstacle.radius).toBeLessThanOrEqual(NOTME_COURSE.width);
        expect(obstacle.center.y - obstacle.radius).toBeGreaterThanOrEqual(0);
        expect(obstacle.center.y + obstacle.radius).toBeLessThanOrEqual(NOTME_COURSE.goalY);
      }

      if (obstacle.kind === 'spinner') {
        const halfLength = obstacle.length / 2;
        expect(obstacle.center.x - halfLength).toBeGreaterThanOrEqual(0);
        expect(obstacle.center.x + halfLength).toBeLessThanOrEqual(NOTME_COURSE.width);
        expect(obstacle.center.y - halfLength).toBeGreaterThanOrEqual(0);
        expect(obstacle.center.y + halfLength).toBeLessThanOrEqual(NOTME_COURSE.goalY);
      }
    }
  });

  it('외벽, 구간 순서, 골인선과 경계를 벗어난 형상을 거부한다', () => {
    const missingWall = structuredClone(NOTME_COURSE);
    missingWall.walls = [];

    const wrongSections = structuredClone(NOTME_COURSE);
    wrongSections.sections.reverse();

    const wrongGoal = structuredClone(NOTME_COURSE);
    wrongGoal.goalSensor.from.y -= 1;

    const outsideCircle = structuredClone(NOTME_COURSE);
    const pin = outsideCircle.sections[1].obstacles.find(({ kind }) => kind === 'circle');
    if (!pin || pin.kind !== 'circle') throw new Error('핀 원형 장애물이 필요합니다.');
    pin.center.x = pin.radius - 0.1;

    expect(validateCourse(missingWall)).not.toEqual([]);
    expect(validateCourse(wrongSections)).not.toEqual([]);
    expect(validateCourse(wrongGoal)).not.toEqual([]);
    expect(validateCourse(outsideCircle)).not.toEqual([]);
  });

  it('0길이 일반 선분과 전폭이 아닌 골인 센서를 거부한다', () => {
    const zeroLengthLine = structuredClone(NOTME_COURSE);
    const line = zeroLengthLine.sections[0].obstacles.find(({ kind }) => kind === 'line');
    if (!line || line.kind !== 'line') throw new Error('램프 선분이 필요합니다.');
    line.to = { ...line.from };

    const partialSensor = structuredClone(NOTME_COURSE);
    partialSensor.goalSensor.from.x = 1;

    const zeroLengthSensor = structuredClone(NOTME_COURSE);
    zeroLengthSensor.goalSensor.to.x = 0;

    const reversedSensor = structuredClone(NOTME_COURSE);
    reversedSensor.goalSensor = {
      from: { x: reversedSensor.width, y: reversedSensor.goalY },
      to: { x: 0, y: reversedSensor.goalY },
    };

    expect(validateCourse(zeroLengthLine)).toEqual(expect.arrayContaining([
      expect.stringContaining('선분'),
    ]));
    expect(validateCourse(partialSensor)).not.toEqual([]);
    expect(validateCourse(zeroLengthSensor)).not.toEqual([]);
    expect(validateCourse(reversedSensor)).toEqual([]);
  });

  it('NaN 선분 좌표와 0 또는 음수 크기의 원형·회전봉을 거부한다', () => {
    const nanLine = structuredClone(NOTME_COURSE);
    const line = nanLine.sections[0].obstacles.find(({ kind }) => kind === 'line');
    if (!line || line.kind !== 'line') throw new Error('램프 선분이 필요합니다.');
    line.from.x = Number.NaN;

    const invalidCircleRadii = [Number.NaN, 0, -1];
    const invalidSpinnerLengths = [0, -1];

    expect(validateCourse(nanLine)).toEqual(expect.arrayContaining([
      expect.stringContaining('선분'),
    ]));

    for (const radius of invalidCircleRadii) {
      const course = structuredClone(NOTME_COURSE);
      const pin = course.sections[1].obstacles.find(({ kind }) => kind === 'circle');
      if (!pin || pin.kind !== 'circle') throw new Error('핀 원형 장애물이 필요합니다.');
      pin.radius = radius;

      expect(validateCourse(course)).toEqual(expect.arrayContaining([
        expect.stringContaining('원형 장애물'),
      ]));
    }

    for (const length of invalidSpinnerLengths) {
      const course = structuredClone(NOTME_COURSE);
      const spinner = course.sections[2].obstacles.find(({ kind }) => kind === 'spinner');
      if (!spinner || spinner.kind !== 'spinner') throw new Error('회전봉 장애물이 필요합니다.');
      spinner.length = length;

      expect(validateCourse(course)).toEqual(expect.arrayContaining([
        expect.stringContaining('회전봉'),
      ]));
    }
  });

  it('비어 있거나 중복된 spinner ID와 폭을 넘는 회전봉을 거부한다', () => {
    const emptyId = structuredClone(NOTME_COURSE);
    const emptySpinner = emptyId.sections[2].obstacles.find(({ kind }) => kind === 'spinner');
    if (!emptySpinner || emptySpinner.kind !== 'spinner') throw new Error('회전봉 장애물이 필요합니다.');
    emptySpinner.id = '   ';

    const duplicateId = structuredClone(NOTME_COURSE);
    const spinners = duplicateId.sections[2].obstacles.filter(({ kind }) => kind === 'spinner');
    if (spinners.length < 2 || spinners[0].kind !== 'spinner' || spinners[1].kind !== 'spinner') {
      throw new Error('서로 다른 ID의 회전봉 두 개가 필요합니다.');
    }
    spinners[1].id = spinners[0].id;

    const outsideSpinner = structuredClone(NOTME_COURSE);
    const spinner = outsideSpinner.sections[2].obstacles.find(({ kind }) => kind === 'spinner');
    if (!spinner || spinner.kind !== 'spinner') throw new Error('회전봉 장애물이 필요합니다.');
    spinner.center.x = outsideSpinner.width - spinner.length / 2 + 0.1;

    expect(validateCourse(emptyId)).not.toEqual([]);
    expect(validateCourse(duplicateId)).not.toEqual([]);
    expect(validateCourse(outsideSpinner)).not.toEqual([]);
  });
});
