import type { MarbleSeed } from '../marbleConfig';
import { createMarbleColors } from '../marblePresentation';
import type { CameraView } from './Camera';
import type { ActiveMarble, RaceSnapshot } from './RouletteEngine';
import type {
  CircleObstacle,
  CourseDefinition,
  DynamicObstacleSnapshot,
  LineObstacle,
  SkillEffectSnapshot,
} from './types';

const COLORS = {
  background: '#211b18',
  course: '#efd5ae',
  accent: '#ef8d6f',
  skillEffect: '#7dd3fc',
  viewport: '#fff3df',
} as const;
const FULL_CIRCLE = Math.PI * 2;

type CanvasSize = {
  width: number;
  height: number;
};

export type CanvasRenderTarget = {
  main: CanvasRenderingContext2D;
  minimap: CanvasRenderingContext2D;
};

export class CanvasRenderer {
  private readonly marbleColors: ReadonlyMap<string, string>;

  constructor(private readonly course: CourseDefinition, shuffledMarbles: readonly MarbleSeed[]) {
    this.marbleColors = createMarbleColors(shuffledMarbles);
  }

  render(
    target: CanvasRenderTarget,
    snapshot: RaceSnapshot,
    cameraView: CameraView,
  ): void {
    const mainSize = prepareCanvas(target.main);
    const minimapSize = prepareCanvas(target.minimap);

    this.renderMain(target.main, mainSize, snapshot, cameraView);
    this.renderMinimap(target.minimap, minimapSize, snapshot, cameraView);
  }

  private renderMain(
    context: CanvasRenderingContext2D,
    size: CanvasSize,
    snapshot: RaceSnapshot,
    cameraView: CameraView,
  ): void {
    context.fillStyle = COLORS.background;
    context.fillRect(0, 0, size.width, size.height);

    const worldScale = size.height / cameraView.height;
    const offsetX = -cameraView.leftX * worldScale;
    const offsetY = -cameraView.topY * worldScale;

    context.save();
    context.translate(offsetX, offsetY);
    context.scale(worldScale, worldScale);
    drawStaticCourse(context, this.course, 1 / worldScale);
    drawDynamicObstacles(context, snapshot.dynamicObstacles, 1 / worldScale);
    drawSkillEffects(context, snapshot.skillEffects, 2 / worldScale);
    drawMarbles(context, snapshot.active, worldScale, this.marbleColors, cameraView);
    context.restore();
  }

  private renderMinimap(
    context: CanvasRenderingContext2D,
    size: CanvasSize,
    snapshot: RaceSnapshot,
    cameraView: CameraView,
  ): void {
    context.fillStyle = COLORS.background;
    context.fillRect(0, 0, size.width, size.height);

    const scale = Math.min(
      size.width / this.course.width,
      size.height / this.course.goalY,
    );
    const offsetX = (size.width - this.course.width * scale) / 2;
    const offsetY = (size.height - this.course.goalY * scale) / 2;

    context.save();
    context.translate(offsetX, offsetY);
    context.scale(scale, scale);
    drawStaticCourse(context, this.course, 1 / scale);
    drawDynamicObstacles(context, snapshot.dynamicObstacles, 1 / scale);
    drawSkillEffects(context, snapshot.skillEffects, 2 / scale);
    drawMarbles(context, snapshot.active, scale, this.marbleColors);
    context.strokeStyle = COLORS.viewport;
    context.lineWidth = 1.5 / scale;
    context.strokeRect(cameraView.leftX, cameraView.topY, cameraView.width, cameraView.height);
    context.restore();
  }
}

function prepareCanvas(context: CanvasRenderingContext2D): CanvasSize {
  const { canvas } = context;
  const bounds = canvas.getBoundingClientRect();
  const width = bounds.width || canvas.clientWidth || 1;
  const height = bounds.height || canvas.clientHeight || 1;
  const ratio = Number.isFinite(globalThis.devicePixelRatio) && globalThis.devicePixelRatio > 0
    ? globalThis.devicePixelRatio
    : 1;
  const backingWidth = Math.round(width * ratio);
  const backingHeight = Math.round(height * ratio);

  if (canvas.width !== backingWidth) canvas.width = backingWidth;
  if (canvas.height !== backingHeight) canvas.height = backingHeight;

  // setTransform은 매 프레임 절대값으로 지정해 resize와 반복 render에서 배율이 누적되지 않게 한다.
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  context.clearRect(0, 0, width, height);
  return { width, height };
}

function drawStaticCourse(
  context: CanvasRenderingContext2D,
  course: CourseDefinition,
  lineWidth: number,
): void {
  context.strokeStyle = COLORS.course;
  context.lineWidth = lineWidth;

  for (const wall of course.walls) drawLine(context, wall);
  for (const section of course.sections) {
    for (const obstacle of section.obstacles) {
      if (obstacle.kind === 'line') drawLine(context, obstacle);
      if (obstacle.kind === 'circle') drawCircle(context, obstacle);
      // spinner는 물리 snapshot angle로만 그려 정적 초기 angle과 중복하지 않는다.
    }
  }

  context.strokeStyle = COLORS.accent;
  drawLine(context, { kind: 'line', ...course.goalSensor });
}

function drawLine(context: CanvasRenderingContext2D, line: LineObstacle): void {
  context.beginPath();
  context.moveTo(line.from.x, line.from.y);
  context.lineTo(line.to.x, line.to.y);
  context.stroke();
}

function drawCircle(context: CanvasRenderingContext2D, circle: CircleObstacle): void {
  context.beginPath();
  context.arc(circle.center.x, circle.center.y, circle.radius, 0, FULL_CIRCLE);
  context.stroke();
}

function drawDynamicObstacles(
  context: CanvasRenderingContext2D,
  obstacles: readonly DynamicObstacleSnapshot[],
  lineWidth: number,
): void {
  context.strokeStyle = COLORS.accent;
  context.lineWidth = lineWidth * 1.5;

  for (const obstacle of obstacles) {
    context.save();
    context.translate(obstacle.center.x, obstacle.center.y);
    context.rotate(obstacle.angle);
    context.beginPath();
    context.moveTo(-obstacle.length / 2, 0);
    context.lineTo(obstacle.length / 2, 0);
    context.stroke();
    context.restore();
  }
}

function drawSkillEffects(
  context: CanvasRenderingContext2D,
  effects: readonly SkillEffectSnapshot[],
  lineWidth: number,
): void {
  context.save();
  context.strokeStyle = COLORS.skillEffect;
  context.lineWidth = lineWidth;

  for (const effect of effects) {
    const progress = effect.elapsedMs / effect.durationMs;
    context.globalAlpha = 1 - progress * progress;
    context.beginPath();
    context.arc(
      effect.center.x,
      effect.center.y,
      0.5 + progress * 4.5,
      0,
      FULL_CIRCLE,
    );
    context.stroke();
  }

  context.restore();
}

function drawMarbles(
  context: CanvasRenderingContext2D,
  marbles: readonly ActiveMarble[],
  worldScale: number,
  marbleColors: ReadonlyMap<string, string>,
  cameraView?: CameraView,
): void {
  for (const marble of marbles) {
    const { body } = marble;
    if (cameraView && (
      body.x + body.radius < cameraView.leftX
      || body.x - body.radius > cameraView.leftX + cameraView.width
      || body.y + body.radius < cameraView.topY
      || body.y - body.radius > cameraView.topY + cameraView.height
    )) continue;

    context.fillStyle = marbleColors.get(marble.id)!;
    context.beginPath();
    context.arc(body.x, body.y, body.radius, 0, FULL_CIRCLE);
    context.fill();

    if (!cameraView) continue;

    context.save();
    context.translate(body.x, body.y - body.radius);
    // 카메라 배율을 상쇄해 전체 이름과 외곽선의 화면 크기를 유지한다.
    context.scale(1 / worldScale, 1 / worldScale);
    context.font = '12px sans-serif';
    context.strokeStyle = COLORS.background;
    context.lineWidth = 3;
    context.textAlign = 'center';
    context.textBaseline = 'bottom';
    context.strokeText(marble.name, 0, -4);
    context.fillText(marble.name, 0, -4);
    context.restore();
  }
}
