// @vitest-environment node

import { describe, expect, it } from 'vitest';

import { NOTME_COURSE, validateCourse } from './course';
import type { CourseObstacle } from './types';

type Line = Extract<CourseObstacle, { kind: 'line' }>;
type Spinner = Extract<CourseObstacle, { kind: 'spinner' }>;
type Box = Extract<CourseObstacle, { kind: 'box' }>;

function isLine(obstacle: CourseObstacle): obstacle is Line {
  return obstacle.kind === 'line';
}

function isSpinner(obstacle: CourseObstacle): obstacle is Spinner {
  return obstacle.kind === 'spinner';
}

describe('NOTME_COURSE', () => {
  it('다섯 구간과 유효한 골인선을 가진다', () => {
    expect(NOTME_COURSE.width).toBe(26);
    expect(NOTME_COURSE.viewportHeight).toBe(24);
    expect(NOTME_COURSE.goalY).toBe(111);
    expect(NOTME_COURSE.sections.map(({ kind }) => kind)).toEqual([
      'ramps',
      'pins',
      'spinner',
      'fork',
      'finish',
    ]);
    expect(validateCourse(NOTME_COURSE)).toEqual([]);
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

  it('참고 맵에 사각 장애물과 회전봉 구조를 둔다', () => {
    const obstacles = NOTME_COURSE.sections.flatMap(({ obstacles }) => obstacles);
    const boxes = obstacles.filter((obstacle): obstacle is Box => obstacle.kind === 'box');
    const spinners = obstacles.filter(isSpinner);

    expect(boxes).toHaveLength(36);
    expect(obstacles.filter(({ kind }) => kind === 'circle')).toHaveLength(0);
    expect(spinners).toMatchObject([
      { id: 'spinner:row-1', center: { x: 8, y: 75 }, length: 2, angularVelocity: 3.5 },
      { id: 'spinner:row-2', center: { x: 12, y: 75 }, length: 2, angularVelocity: -3.5 },
      { id: 'spinner:row-3', center: { x: 16, y: 75 }, length: 2, angularVelocity: 3.5 },
      { id: 'spinner:row-4', center: { x: 20, y: 75 }, length: 2, angularVelocity: -3.5 },
      { id: 'spinner:row-5', center: { x: 24, y: 75 }, length: 2, angularVelocity: 3.5 },
      { id: 'spinner:finish-gate', center: { x: 14, y: 106.75 }, length: 2, angularVelocity: -1.2 },
    ]);
  });

  it('참고 맵에 연속 이동벽과 내부 폐쇄 구조물을 둔다', () => {
    const obstacles = NOTME_COURSE.sections.flatMap(({ obstacles }) => obstacles);
    const internalWalls = obstacles.filter(isLine);

    expect(internalWalls).toEqual(expect.arrayContaining([
      { kind: 'line', from: { x: 9.25, y: 0 }, to: { x: 9.25, y: 8.5 } },
      { kind: 'line', from: { x: 9.25, y: 8.5 }, to: { x: 2, y: 19.25 } },
      { kind: 'line', from: { x: 16.5, y: 9.25 }, to: { x: 9.5, y: 20 } },
      { kind: 'line', from: { x: 1.25, y: 53.75 }, to: { x: 8.25, y: 58.75 } },
      { kind: 'line', from: { x: 19, y: 55.5 }, to: { x: 24, y: 59.25 } },
      { kind: 'line', from: { x: 12.75, y: 37.5 }, to: { x: 7, y: 43.5 } },
      { kind: 'line', from: { x: 14.75, y: 43 }, to: { x: 17.5, y: 40.25 } },
      { kind: 'line', from: { x: 8.25, y: 99.25 }, to: { x: 15.1, y: 106.75 } },
      { kind: 'line', from: { x: 24, y: 100.5 }, to: { x: 16, y: 106.75 } },
      { kind: 'line', from: { x: 26, y: 100.5 }, to: { x: 16, y: 106.75 } },
      { kind: 'line', from: { x: 15.1, y: 106.75 }, to: { x: 15.1, y: 111 } },
      { kind: 'line', from: { x: 16, y: 106.75 }, to: { x: 16, y: 111 } },
    ]));
    expect(NOTME_COURSE.goalSensor).toEqual({
      from: { x: 15.1, y: 111 },
      to: { x: 16, y: 111 },
    });
    expect(NOTME_COURSE.goalSensor.to.x - NOTME_COURSE.goalSensor.from.x).toBeCloseTo(0.9, 5);
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
    const pin = { kind: 'circle' as const, center: { x: 1, y: 1 }, radius: 1 };
    outsideCircle.sections[1].obstacles.push(pin);
    pin.center.x = pin.radius - 0.1;

    expect(validateCourse(missingWall)).not.toEqual([]);
    expect(validateCourse(wrongSections)).not.toEqual([]);
    expect(validateCourse(wrongGoal)).not.toEqual([]);
    expect(validateCourse(outsideCircle)).not.toEqual([]);
  });

  it('0길이 일반 선분과 골인 센서를 거부하고 좁은 역방향 센서를 허용한다', () => {
    const zeroLengthLine = structuredClone(NOTME_COURSE);
    const line = zeroLengthLine.sections[0].obstacles.find(({ kind }) => kind === 'line');
    if (!line || line.kind !== 'line') throw new Error('램프 선분이 필요합니다.');
    line.to = { ...line.from };

    const zeroLengthSensor = structuredClone(NOTME_COURSE);
    zeroLengthSensor.goalSensor.to.x = zeroLengthSensor.goalSensor.from.x;

    const reversedSensor = structuredClone(NOTME_COURSE);
    reversedSensor.goalSensor = {
      from: { x: 15, y: reversedSensor.goalY },
      to: { x: 11, y: reversedSensor.goalY },
    };

    expect(validateCourse(zeroLengthLine)).toEqual(expect.arrayContaining([
      expect.stringContaining('선분'),
    ]));
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
      const pin = { kind: 'circle' as const, center: { x: 1, y: 1 }, radius: 1 };
      course.sections[1].obstacles.push(pin);
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

  it('회전한 box의 실제 외곽과 반발력을 검증한다', () => {
    const validBox = {
      kind: 'box' as const,
      center: { x: 13, y: 40 },
      width: 2,
      height: 0.4,
      angle: Math.PI / 4,
      restitution: 0.75,
    };
    const valid = structuredClone(NOTME_COURSE);
    valid.sections[1].obstacles.push(validBox);
    expect(validateCourse(valid)).toEqual([]);

    for (const mutate of [
      (box: typeof validBox) => { box.width = 0; },
      (box: typeof validBox) => { box.angle = Number.NaN; },
      (box: typeof validBox) => { box.restitution = 1.1; },
      (box: typeof validBox) => { box.center.x = 0.1; },
    ]) {
      const invalid = structuredClone(valid);
      const box = invalid.sections[1].obstacles.at(-1);
      if (!box || box.kind !== 'box') throw new Error('box 장애물이 필요합니다.');
      mutate(box);
      expect(validateCourse(invalid)).toEqual(expect.arrayContaining([
        expect.stringContaining('사각 장애물'),
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
