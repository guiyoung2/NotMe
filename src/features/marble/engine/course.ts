import type { CourseDefinition, CourseObstacle, CoursePoint, LineObstacle } from './types';

const SECTION_KINDS = ['ramps', 'pins', 'spinner', 'fork', 'finish'] as const;

export const NOTME_COURSE: CourseDefinition = {
  width: 26,
  viewportHeight: 24,
  goalY: 120,
  walls: [
    { kind: 'line', from: { x: 0, y: 0 }, to: { x: 26, y: 0 } },
    { kind: 'line', from: { x: 0, y: 0 }, to: { x: 0, y: 120 } },
    { kind: 'line', from: { x: 26, y: 0 }, to: { x: 26, y: 120 } },
  ],
  sections: [
    {
      kind: 'ramps',
      obstacles: [
        { kind: 'line', from: { x: 2, y: 8 }, to: { x: 16, y: 14.125 } },
        { kind: 'line', from: { x: 24, y: 11 }, to: { x: 8, y: 22 } },
        { kind: 'line', from: { x: 3, y: 24 }, to: { x: 14, y: 28 } },
      ],
    },
    {
      kind: 'pins',
      obstacles: [
        { kind: 'circle', center: { x: 5, y: 33 }, radius: 0.5 },
        { kind: 'circle', center: { x: 10.3, y: 33 }, radius: 0.5 },
        { kind: 'circle', center: { x: 15.7, y: 33 }, radius: 0.5 },
        { kind: 'circle', center: { x: 21, y: 33 }, radius: 0.5 },
        { kind: 'circle', center: { x: 3, y: 39 }, radius: 0.5 },
        { kind: 'circle', center: { x: 8, y: 39 }, radius: 0.5 },
        { kind: 'circle', center: { x: 13, y: 39 }, radius: 0.5 },
        { kind: 'circle', center: { x: 18, y: 39 }, radius: 0.5 },
        { kind: 'circle', center: { x: 23, y: 39 }, radius: 0.5 },
        { kind: 'circle', center: { x: 6.5, y: 45 }, radius: 0.5 },
        { kind: 'circle', center: { x: 13, y: 45 }, radius: 0.5 },
        { kind: 'circle', center: { x: 19.5, y: 45 }, radius: 0.5 },
      ],
    },
    {
      kind: 'spinner',
      obstacles: [
        { kind: 'line', from: { x: 2, y: 51 }, to: { x: 8, y: 55 } },
        {
          kind: 'spinner', id: 'spinner:upper-left',
          center: { x: 7, y: 53 },
          length: 5,
          angle: 0,
          angularVelocity: 2.2,
        },
        {
          kind: 'spinner', id: 'spinner:upper-right',
          center: { x: 16.5, y: 59 },
          length: 6,
          angle: Math.PI / 2,
          angularVelocity: -1.8,
        },
        {
          kind: 'spinner', id: 'spinner:lower-left',
          center: { x: 9, y: 66 },
          length: 6,
          angle: Math.PI,
          angularVelocity: 1.9,
        },
        {
          kind: 'spinner', id: 'spinner:lower-right',
          center: { x: 18, y: 73 },
          length: 5,
          angle: Math.PI / 2,
          angularVelocity: -2.1,
        },
        { kind: 'line', from: { x: 24, y: 63 }, to: { x: 18, y: 72 } },
      ],
    },
    {
      kind: 'fork',
      obstacles: [
        { kind: 'line', from: { x: 13, y: 76 }, to: { x: 5, y: 93 } },
        { kind: 'line', from: { x: 13, y: 76 }, to: { x: 21, y: 93 } },
        { kind: 'line', from: { x: 5, y: 93 }, to: { x: 9, y: 100 } },
        { kind: 'line', from: { x: 21, y: 93 }, to: { x: 17, y: 100 } },
        { kind: 'circle', center: { x: 13, y: 89 }, radius: 0.55 },
      ],
    },
    {
      kind: 'finish',
      obstacles: [
        { kind: 'line', from: { x: 0, y: 102 }, to: { x: 11, y: 114 } },
        { kind: 'line', from: { x: 26, y: 102 }, to: { x: 15, y: 114 } },
        { kind: 'line', from: { x: 11, y: 114 }, to: { x: 11, y: 120 } },
        { kind: 'line', from: { x: 15, y: 114 }, to: { x: 15, y: 120 } },
        {
          kind: 'spinner', id: 'spinner:finish-gate',
          center: { x: 13, y: 116 },
          length: 2.4,
          angle: 0,
          angularVelocity: 2.8,
        },
      ],
    },
  ],
  goalSensor: {
    from: { x: 11, y: 120 },
    to: { x: 15, y: 120 },
  },
};

export function validateCourse(course: CourseDefinition): string[] {
  const errors: string[] = [];

  if (!isPositiveNumber(course.width)) errors.push('코스 너비는 양수여야 합니다.');
  if (!isPositiveNumber(course.viewportHeight)) errors.push('뷰포트 높이는 양수여야 합니다.');
  if (!isPositiveNumber(course.goalY)) errors.push('골인 y 좌표는 양수여야 합니다.');

  if (!hasFullHeightWall(course.walls, 0, course.goalY)) {
    errors.push('왼쪽 외벽이 시작 지점부터 골인까지 이어져야 합니다.');
  }
  if (!hasFullHeightWall(course.walls, course.width, course.goalY)) {
    errors.push('오른쪽 외벽이 시작 지점부터 골인까지 이어져야 합니다.');
  }

  if (
    course.sections.length !== SECTION_KINDS.length
    || course.sections.some((section, index) => section.kind !== SECTION_KINDS[index])
  ) {
    errors.push('코스 구간은 ramps, pins, spinner, fork, finish 순서여야 합니다.');
  }

  if (!isPointInBounds(course.goalSensor.from, course) || !isPointInBounds(course.goalSensor.to, course)) {
    errors.push('골인 센서는 코스 범위 안에 있어야 합니다.');
  }
  if (course.goalSensor.from.y !== course.goalY || course.goalSensor.to.y !== course.goalY) {
    errors.push('골인 센서는 goalY에 있어야 합니다.');
  }
  if (!isValidGoalSensor(course)) {
    errors.push('골인 센서는 goalY에서 양의 폭을 가져야 합니다.');
  }

  for (const wall of course.walls) validateLine(wall, course, errors);
  for (const section of course.sections) {
    for (const obstacle of section.obstacles) validateObstacle(obstacle, course, errors);
  }

  return errors;
}

function hasFullHeightWall(walls: LineObstacle[], x: number, goalY: number): boolean {
  return walls.some(({ from, to }) => (
    (from.x === x && from.y === 0 && to.x === x && to.y === goalY)
    || (to.x === x && to.y === 0 && from.x === x && from.y === goalY)
  ));
}

function isValidGoalSensor(course: CourseDefinition): boolean {
  const left = Math.min(course.goalSensor.from.x, course.goalSensor.to.x);
  const right = Math.max(course.goalSensor.from.x, course.goalSensor.to.x);
  return course.goalSensor.from.y === course.goalY
    && course.goalSensor.to.y === course.goalY
    && right > left;
}

function validateObstacle(obstacle: CourseObstacle, course: CourseDefinition, errors: string[]): void {
  if (obstacle.kind === 'line') {
    validateLine(obstacle, course, errors);
    return;
  }

  if (obstacle.kind === 'circle') {
    if (!isPositiveNumber(obstacle.radius) || !isCircleInBounds(obstacle.center, obstacle.radius, course)) {
      errors.push('원형 장애물은 반경을 포함해 코스 범위 안에 있어야 합니다.');
    }
    return;
  }

  if (!obstacle.id.trim()) errors.push('회전봉 ID는 비어 있을 수 없습니다.');
  if (!isPositiveNumber(obstacle.length) || !isCircleInBounds(obstacle.center, obstacle.length / 2, course)) {
    errors.push('회전봉은 길이를 포함해 코스 범위 안에 있어야 합니다.');
  }
  if (!Number.isFinite(obstacle.angle) || !Number.isFinite(obstacle.angularVelocity)) {
    errors.push('회전봉 각도와 각속도는 유한해야 합니다.');
  }

  const duplicateCount = course.sections
    .flatMap(({ obstacles }) => obstacles)
    .filter((candidate) => candidate.kind === 'spinner' && candidate.id === obstacle.id)
    .length;
  if (duplicateCount > 1) errors.push(`회전봉 ID ${obstacle.id}가 중복되었습니다.`);
}

function validateLine(line: Pick<LineObstacle, 'from' | 'to'>, course: CourseDefinition, errors: string[]): void {
  if (
    !isPointInBounds(line.from, course)
    || !isPointInBounds(line.to, course)
    || !(Math.hypot(line.to.x - line.from.x, line.to.y - line.from.y) > 0)
  ) {
    errors.push('선분의 끝점은 코스 범위 안에 있어야 합니다.');
  }
}

function isCircleInBounds(center: CoursePoint, radius: number, course: CourseDefinition): boolean {
  return (
    isPointInBounds(center, course)
    && center.x - radius >= 0
    && center.x + radius <= course.width
    && center.y - radius >= 0
    && center.y + radius <= course.goalY
  );
}

function isPointInBounds(point: CoursePoint, course: CourseDefinition): boolean {
  return (
    Number.isFinite(point.x)
    && Number.isFinite(point.y)
    && point.x >= 0
    && point.x <= course.width
    && point.y >= 0
    && point.y <= course.goalY
  );
}

function isPositiveNumber(value: number): boolean {
  return Number.isFinite(value) && value > 0;
}
