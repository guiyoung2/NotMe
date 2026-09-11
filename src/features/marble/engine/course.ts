import type { BoxObstacle, CourseDefinition, CourseObstacle, CoursePoint, LineObstacle } from './types';

const SECTION_KINDS = ['ramps', 'pins', 'spinner', 'fork', 'finish'] as const;

const B = (
  x: number, y: number, width: number, height: number,
  angle: number, restitution = 0.15,
): BoxObstacle => ({ kind: 'box', center: { x, y }, width, height, angle, restitution });

const toLines = (points: readonly CoursePoint[]): LineObstacle[] => points.slice(1).map((to, index) => ({
  kind: 'line', from: points[index], to,
}));

const LEFT_CORRIDOR = [
  { x: 9.25, y: 0 }, { x: 9.25, y: 8.5 }, { x: 2, y: 19.25 },
  { x: 2, y: 26 }, { x: 9.75, y: 30 }, { x: 9.75, y: 33.5 },
  { x: 1.25, y: 41 }, { x: 1.25, y: 53.75 }, { x: 8.25, y: 58.75 },
  { x: 8.25, y: 63 }, { x: 9.25, y: 64 }, { x: 8.25, y: 65 },
  { x: 8.25, y: 99.25 }, { x: 13.6, y: 103.5 }, { x: 15.1, y: 105.5 }, { x: 15.1, y: 111 },
] as const satisfies readonly CoursePoint[];

const RIGHT_CORRIDOR = [
  { x: 16.5, y: 0 }, { x: 16.5, y: 9.25 }, { x: 9.5, y: 20 },
  { x: 9.5, y: 22.5 }, { x: 17.5, y: 26 }, { x: 17.5, y: 33.5 },
  { x: 24, y: 38.5 }, { x: 19, y: 45.5 }, { x: 19, y: 55.5 },
  { x: 24, y: 59.25 }, { x: 24, y: 63 }, { x: 23, y: 64 },
  { x: 24, y: 65 }, { x: 24, y: 100.5 }, { x: 17.4, y: 103.5 },
  { x: 16, y: 105.5 }, { x: 16, y: 111 },
] as const satisfies readonly CoursePoint[];

const INNER_LINES = [
  ...toLines([
    { x: 12.75, y: 37.5 }, { x: 7, y: 43.5 }, { x: 7, y: 49.75 },
    { x: 12.75, y: 53.75 }, { x: 12.75, y: 37.5 },
  ]),
  ...toLines([
    { x: 14.75, y: 37.5 }, { x: 14.75, y: 43 },
    { x: 17.5, y: 40.25 }, { x: 14.75, y: 37.5 },
  ]),
] satisfies LineObstacle[];

const CHEVRON_X = [9.4, 11.3, 13.2, 15.1, 17, 18.9, 20.7, 22.7] as const;
const LOWER_PIN_ROWS = [
  { y: 92, xs: [9.5, 12.75, 16, 19.25, 22.5] },
  { y: 95, xs: [11, 14.25, 17.5, 20.75] },
  { y: 98, xs: [9.5, 12.75, 16, 19.25, 22.5] },
] as const;

const TOP_PINS = [
  B(15.5, 30, 0.2, 0.2, -Math.PI / 4, 1),
  B(15.5, 32, 0.2, 0.2, -Math.PI / 4),
  B(15.5, 28, 0.2, 0.2, -Math.PI / 4),
  B(12.5, 30, 0.2, 0.2, -Math.PI / 4),
  B(12.5, 32, 0.2, 0.2, -Math.PI / 4),
  B(12.5, 28, 0.2, 0.2, -Math.PI / 4),
];

const CHEVRONS = [
  ...CHEVRON_X.map((x) => B(x, 66.6, 0.6, 0.1, Math.PI / 4)),
  ...CHEVRON_X.map((x) => B(x, 69.1, 0.6, 0.1, -Math.PI / 4)),
];

const LOWER_PINS = LOWER_PIN_ROWS.flatMap(({ y, xs }) => (
  xs.map((x) => B(x, y, 0.25, 0.25, Math.PI / 4))
));

export const NOTME_COURSE: CourseDefinition = {
  width: 26,
  viewportHeight: 24,
  goalY: 111,
  walls: [
    { kind: 'line', from: { x: 0, y: 0 }, to: { x: 26, y: 0 } },
    { kind: 'line', from: { x: 0, y: 0 }, to: { x: 0, y: 111 } },
    { kind: 'line', from: { x: 26, y: 0 }, to: { x: 26, y: 111 } },
  ],
  sections: [
    {
      kind: 'ramps',
      obstacles: [
        ...toLines(LEFT_CORRIDOR.slice(0, 6)),
        ...toLines(RIGHT_CORRIDOR.slice(0, 6)),
        ...TOP_PINS,
      ],
    },
    {
      kind: 'pins',
      obstacles: [
        ...toLines(LEFT_CORRIDOR.slice(5, 12)),
        ...toLines(RIGHT_CORRIDOR.slice(5, 13)),
        ...INNER_LINES,
        ...CHEVRONS,
      ],
    },
    {
      kind: 'spinner',
      obstacles: [
        ...toLines(LEFT_CORRIDOR.slice(11, 13)),
        ...toLines(RIGHT_CORRIDOR.slice(12, 14)),
        {
          kind: 'spinner', id: 'spinner:row-1',
          center: { x: 8, y: 75 },
          length: 4,
          angle: 0,
          angularVelocity: 3.5,
        },
        {
          kind: 'spinner', id: 'spinner:row-2',
          center: { x: 12, y: 75 },
          length: 4,
          angle: 0,
          angularVelocity: -3.5,
        },
        {
          kind: 'spinner', id: 'spinner:row-3',
          center: { x: 16, y: 75 },
          length: 4,
          angle: 0,
          angularVelocity: 3.5,
        },
        {
          kind: 'spinner', id: 'spinner:row-4',
          center: { x: 20, y: 75 },
          length: 4,
          angle: 0,
          angularVelocity: -3.5,
        },
        {
          kind: 'spinner', id: 'spinner:row-5',
          center: { x: 24, y: 75 },
          length: 4,
          angle: 0,
          angularVelocity: 3.5,
        },
      ],
    },
    {
      kind: 'fork',
      obstacles: [
        ...LOWER_PINS,
      ],
    },
    {
      kind: 'finish',
      obstacles: [
        ...toLines(LEFT_CORRIDOR.slice(12)),
        ...toLines(RIGHT_CORRIDOR.slice(13)),
        {
          kind: 'spinner', id: 'spinner:finish-gate',
          center: { x: 13.2, y: 107.75 },
          length: 4.5,
          angle: 0,
          angularVelocity: -1.2,
        },
      ],
    },
  ],
  goalSensor: {
    from: { x: 15.1, y: 111 },
    to: { x: 16, y: 111 },
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
