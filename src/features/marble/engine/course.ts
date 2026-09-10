import type { CourseDefinition, CourseObstacle, CoursePoint, LineObstacle } from './types';

const SECTION_KINDS = ['ramps', 'pins', 'spinner', 'fork', 'finish'] as const;

export const NOTME_COURSE: CourseDefinition = {
  width: 26,
  viewportHeight: 24,
  goalY: 135,
  walls: [
    { kind: 'line', from: { x: 0, y: 0 }, to: { x: 26, y: 0 } },
    { kind: 'line', from: { x: 0, y: 0 }, to: { x: 0, y: 135 } },
    { kind: 'line', from: { x: 26, y: 0 }, to: { x: 26, y: 135 } },
  ],
  sections: [
    {
      kind: 'ramps',
      obstacles: [
        { kind: 'line', from: { x: 2, y: 8 }, to: { x: 16, y: 14 } },
        { kind: 'line', from: { x: 24, y: 17 }, to: { x: 10, y: 24 } },
        { kind: 'line', from: { x: 2, y: 28 }, to: { x: 9, y: 31.5 } },
      ],
    },
    {
      kind: 'pins',
      obstacles: [
        { kind: 'circle', center: { x: 3, y: 36 }, radius: 0.38 },
        { kind: 'circle', center: { x: 7, y: 36 }, radius: 0.38 },
        { kind: 'circle', center: { x: 11, y: 36 }, radius: 0.38 },
        { kind: 'circle', center: { x: 15, y: 36 }, radius: 0.38 },
        { kind: 'circle', center: { x: 19, y: 36 }, radius: 0.38 },
        { kind: 'circle', center: { x: 23, y: 36 }, radius: 0.38 },
        { kind: 'circle', center: { x: 5, y: 41 }, radius: 0.38 },
        { kind: 'circle', center: { x: 9, y: 41 }, radius: 0.38 },
        { kind: 'circle', center: { x: 13, y: 41 }, radius: 0.38 },
        { kind: 'circle', center: { x: 17, y: 41 }, radius: 0.38 },
        { kind: 'circle', center: { x: 21, y: 41 }, radius: 0.38 },
        { kind: 'circle', center: { x: 3, y: 46 }, radius: 0.38 },
        { kind: 'circle', center: { x: 7, y: 46 }, radius: 0.38 },
        { kind: 'circle', center: { x: 11, y: 46 }, radius: 0.38 },
        { kind: 'circle', center: { x: 15, y: 46 }, radius: 0.38 },
        { kind: 'circle', center: { x: 19, y: 46 }, radius: 0.38 },
        { kind: 'circle', center: { x: 23, y: 46 }, radius: 0.38 },
        { kind: 'circle', center: { x: 5, y: 51 }, radius: 0.38 },
        { kind: 'circle', center: { x: 9, y: 51 }, radius: 0.38 },
        { kind: 'circle', center: { x: 13, y: 51 }, radius: 0.38 },
        { kind: 'circle', center: { x: 17, y: 51 }, radius: 0.38 },
        { kind: 'circle', center: { x: 21, y: 51 }, radius: 0.38 },
        { kind: 'circle', center: { x: 3, y: 56 }, radius: 0.38 },
        { kind: 'circle', center: { x: 7, y: 56 }, radius: 0.38 },
        { kind: 'circle', center: { x: 11, y: 56 }, radius: 0.38 },
        { kind: 'circle', center: { x: 15, y: 56 }, radius: 0.38 },
        { kind: 'circle', center: { x: 19, y: 56 }, radius: 0.38 },
        { kind: 'circle', center: { x: 23, y: 56 }, radius: 0.38 },
      ],
    },
    {
      kind: 'spinner',
      obstacles: [
        {
          kind: 'spinner', id: 'spinner:mix-1',
          center: { x: 3, y: 68 },
          length: 3.2,
          angle: 0,
          angularVelocity: 3.2,
        },
        {
          kind: 'spinner', id: 'spinner:mix-2',
          center: { x: 7, y: 68 },
          length: 3.2,
          angle: 0,
          angularVelocity: -3.2,
        },
        {
          kind: 'spinner', id: 'spinner:mix-3',
          center: { x: 11, y: 68 },
          length: 3.2,
          angle: 0,
          angularVelocity: 3.2,
        },
        {
          kind: 'spinner', id: 'spinner:mix-4',
          center: { x: 15, y: 68 },
          length: 3.2,
          angle: 0,
          angularVelocity: -3.2,
        },
        {
          kind: 'spinner', id: 'spinner:mix-5',
          center: { x: 19, y: 68 },
          length: 3.2,
          angle: 0,
          angularVelocity: 3.2,
        },
        {
          kind: 'spinner', id: 'spinner:mix-6',
          center: { x: 23, y: 68 },
          length: 3.2,
          angle: 0,
          angularVelocity: -3.2,
        },
      ],
    },
    {
      kind: 'fork',
      obstacles: [
        { kind: 'line', from: { x: 1.5, y: 76 }, to: { x: 5.5, y: 79 } },
        { kind: 'line', from: { x: 24.5, y: 80 }, to: { x: 20.5, y: 83 } },
        { kind: 'line', from: { x: 1.5, y: 88 }, to: { x: 5.5, y: 91 } },
        { kind: 'line', from: { x: 24.5, y: 94 }, to: { x: 20.5, y: 97 } },
        { kind: 'circle', center: { x: 4, y: 83 }, radius: 0.38 },
        { kind: 'circle', center: { x: 8.5, y: 83 }, radius: 0.38 },
        { kind: 'circle', center: { x: 13, y: 83 }, radius: 0.38 },
        { kind: 'circle', center: { x: 17.5, y: 83 }, radius: 0.38 },
        { kind: 'circle', center: { x: 22, y: 83 }, radius: 0.38 },
        { kind: 'circle', center: { x: 2.5, y: 90 }, radius: 0.38 },
        { kind: 'circle', center: { x: 6.5, y: 90 }, radius: 0.38 },
        { kind: 'circle', center: { x: 10.5, y: 90 }, radius: 0.38 },
        { kind: 'circle', center: { x: 14.5, y: 90 }, radius: 0.38 },
        { kind: 'circle', center: { x: 18.5, y: 90 }, radius: 0.38 },
        { kind: 'circle', center: { x: 22.5, y: 90 }, radius: 0.38 },
        { kind: 'circle', center: { x: 4, y: 97 }, radius: 0.38 },
        { kind: 'circle', center: { x: 8.5, y: 97 }, radius: 0.38 },
        { kind: 'circle', center: { x: 13, y: 97 }, radius: 0.38 },
        { kind: 'circle', center: { x: 17.5, y: 97 }, radius: 0.38 },
        { kind: 'circle', center: { x: 22, y: 97 }, radius: 0.38 },
      ],
    },
    {
      kind: 'finish',
      obstacles: [
        { kind: 'line', from: { x: 0, y: 104 }, to: { x: 5, y: 109 } },
        { kind: 'line', from: { x: 26, y: 104 }, to: { x: 21, y: 109 } },
        { kind: 'line', from: { x: 5, y: 109 }, to: { x: 12.2, y: 128 } },
        { kind: 'line', from: { x: 21, y: 109 }, to: { x: 13.8, y: 128 } },
        { kind: 'circle', center: { x: 9, y: 113 }, radius: 0.42 },
        { kind: 'circle', center: { x: 17, y: 113 }, radius: 0.42 },
        { kind: 'circle', center: { x: 11, y: 119 }, radius: 0.42 },
        { kind: 'circle', center: { x: 15, y: 119 }, radius: 0.42 },
        { kind: 'line', from: { x: 12.2, y: 128 }, to: { x: 12.2, y: 135 } },
        { kind: 'line', from: { x: 13.8, y: 128 }, to: { x: 13.8, y: 135 } },
        {
          kind: 'spinner', id: 'spinner:finish-gate',
          center: { x: 12.35, y: 126 },
          length: 3.2,
          angle: 0,
          angularVelocity: -1.35,
        },
      ],
    },
  ],
  goalSensor: {
    from: { x: 12.2, y: 135 },
    to: { x: 13.8, y: 135 },
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
