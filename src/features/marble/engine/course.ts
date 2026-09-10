import type { BoxObstacle, CourseDefinition, CourseObstacle, CoursePoint, LineObstacle } from './types';

const SECTION_KINDS = ['ramps', 'pins', 'spinner', 'fork', 'finish'] as const;

const B = (
  x: number, y: number, width: number, height: number,
  angle: number, restitution = 0.15,
): BoxObstacle => ({ kind: 'box', center: { x, y }, width, height, angle, restitution });

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
        { kind: 'line', from: { x: 2, y: 8 }, to: { x: 15, y: 13 } },
        { kind: 'line', from: { x: 24, y: 18 }, to: { x: 11, y: 24 } },
        {
          kind: 'spinner', id: 'spinner:upper-left',
          center: { x: 6.5, y: 18 },
          length: 6,
          angle: 0.2,
          angularVelocity: 2.2,
        },
        {
          kind: 'spinner', id: 'spinner:upper-right',
          center: { x: 19, y: 29 },
          length: 5.5,
          angle: -0.5,
          angularVelocity: -1.8,
        },
      ],
    },
    {
      kind: 'pins',
      obstacles: [
        B(3.0, 35, 1.0, 1.0, Math.PI / 4, 0.8),
        B(7.5, 36, 2.0, 0.35, -0.35),
        B(12.5, 34.5, 1.0, 1.0, Math.PI / 4, 0.2),
        B(17.0, 36.5, 2.2, 0.35, 0.3),
        B(22.5, 35, 1.0, 1.0, Math.PI / 4, 0.8),
        B(5.0, 42, 2.2, 0.35, 0.35),
        B(9.5, 43, 1.0, 1.0, Math.PI / 4, 0.75),
        B(14.5, 42, 2.0, 0.35, -0.3),
        B(19.5, 43.5, 1.0, 1.0, Math.PI / 4, 0.2),
        B(23.0, 42, 1.8, 0.35, -0.4),
        B(2.5, 49, 1.0, 1.0, Math.PI / 4, 0.75),
        B(7.0, 50, 2.4, 0.35, -0.3),
        B(12.0, 49, 1.0, 1.0, Math.PI / 4, 0.2),
        B(17.0, 50.5, 2.2, 0.35, 0.35),
        B(22.5, 49, 1.0, 1.0, Math.PI / 4, 0.75),
        B(5.0, 56, 2.6, 0.35, 0.25),
        B(10.5, 56.5, 1.0, 1.0, Math.PI / 4, 0.2),
        B(16.0, 55.5, 2.6, 0.35, -0.25),
        B(21.5, 56.5, 1.0, 1.0, Math.PI / 4, 0.8),
        { kind: 'circle', center: { x: 13, y: 39 }, radius: 0.35 },
        { kind: 'circle', center: { x: 4, y: 54 }, radius: 0.35 },
        { kind: 'circle', center: { x: 23, y: 54 }, radius: 0.35 },
      ],
    },
    {
      kind: 'spinner',
      obstacles: [
        {
          kind: 'spinner', id: 'spinner:row-1',
          center: { x: 3, y: 68 },
          length: 3.2,
          angle: 0,
          angularVelocity: 3.5,
        },
        {
          kind: 'spinner', id: 'spinner:row-2',
          center: { x: 8, y: 68 },
          length: 3.2,
          angle: 0,
          angularVelocity: -3.5,
        },
        {
          kind: 'spinner', id: 'spinner:row-3',
          center: { x: 13, y: 68 },
          length: 3.2,
          angle: 0,
          angularVelocity: 3.5,
        },
        {
          kind: 'spinner', id: 'spinner:row-4',
          center: { x: 18, y: 68 },
          length: 3.2,
          angle: 0,
          angularVelocity: -3.5,
        },
        {
          kind: 'spinner', id: 'spinner:row-5',
          center: { x: 23, y: 68 },
          length: 3.2,
          angle: 0,
          angularVelocity: 3.5,
        },
      ],
    },
    {
      kind: 'fork',
      obstacles: [
        {
          kind: 'spinner', id: 'spinner:lower-left',
          center: { x: 7, y: 83 },
          length: 6.5,
          angle: Math.PI / 6,
          angularVelocity: 2,
        },
        B(16, 80, 2.2, 0.35, -0.3, 0.2),
        B(22, 87, 1.0, 1.0, Math.PI / 4, 0.75),
        { kind: 'line', from: { x: 2, y: 90 }, to: { x: 7, y: 94 } },
        B(12.5, 95, 2.4, 0.35, 0.25, 0.2),
        {
          kind: 'spinner', id: 'spinner:lower-right',
          center: { x: 19, y: 99 },
          length: 7,
          angle: -Math.PI / 5,
          angularVelocity: -1.7,
        },
        B(4, 103, 1.0, 1.0, Math.PI / 4, 0.8),
        B(11, 107, 2.2, 0.35, -0.3, 0.2),
        B(21, 108, 1.0, 1.0, Math.PI / 4, 0.75),
      ],
    },
    {
      kind: 'finish',
      obstacles: [
        { kind: 'line', from: { x: 0, y: 108 }, to: { x: 6.5, y: 116 } },
        { kind: 'line', from: { x: 26, y: 108 }, to: { x: 19.5, y: 116 } },
        { kind: 'line', from: { x: 6.5, y: 116 }, to: { x: 6.5, y: 119 } },
        { kind: 'line', from: { x: 19.5, y: 116 }, to: { x: 19.5, y: 119 } },
        { kind: 'line', from: { x: 6.5, y: 119 }, to: { x: 12.4, y: 126 } },
        { kind: 'line', from: { x: 19.5, y: 119 }, to: { x: 13.6, y: 126 } },
        {
          kind: 'spinner', id: 'spinner:finish-gate',
          center: { x: 11.75, y: 125.2 },
          length: 5.5,
          angle: 0,
          angularVelocity: -1.2,
        },
        { kind: 'line', from: { x: 12.4, y: 126 }, to: { x: 12.4, y: 135 } },
        { kind: 'line', from: { x: 13.6, y: 126 }, to: { x: 13.6, y: 135 } },
      ],
    },
  ],
  goalSensor: {
    from: { x: 12.4, y: 135 },
    to: { x: 13.6, y: 135 },
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

  if (obstacle.kind === 'box') {
    const halfWidth = obstacle.width / 2;
    const halfHeight = obstacle.height / 2;
    const extentX = Math.abs(Math.cos(obstacle.angle)) * halfWidth
      + Math.abs(Math.sin(obstacle.angle)) * halfHeight;
    const extentY = Math.abs(Math.sin(obstacle.angle)) * halfWidth
      + Math.abs(Math.cos(obstacle.angle)) * halfHeight;
    const valid = isPositiveNumber(obstacle.width)
      && isPositiveNumber(obstacle.height)
      && Number.isFinite(obstacle.angle)
      && Number.isFinite(obstacle.restitution)
      && obstacle.restitution >= 0
      && obstacle.restitution <= 1
      && obstacle.center.x - extentX >= 0
      && obstacle.center.x + extentX <= course.width
      && obstacle.center.y - extentY >= 0
      && obstacle.center.y + extentY <= course.goalY;
    if (!valid) errors.push('사각 장애물은 회전 외곽과 반발력을 포함해 유효해야 합니다.');
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
