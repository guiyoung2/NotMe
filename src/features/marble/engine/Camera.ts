import type { RaceSnapshot } from './RouletteEngine';
import type { CourseDefinition } from './types';

const FOLLOW_RATE = 0.1;
const GOAL_ZOOM_DISTANCE = 12;
const MAX_ZOOM = 2;

export type CameraView = {
  /** 현재 화면 중심의 코스 월드 y 좌표 */
  centerY: number;
  /** 현재 화면 상단의 코스 월드 y 좌표 */
  topY: number;
  /** 현재 화면에 보이는 코스 월드 높이 */
  height: number;
  zoom: number;
};

export class Camera {
  private centerY: number | null = null;

  update(snapshot: RaceSnapshot, course: CourseDefinition): CameraView {
    const baseHeight = Math.min(course.viewportHeight, course.goalY);
    const initialCenter = baseHeight / 2;
    const currentCenter = this.centerY ?? initialCenter;
    const targetY = selectTargetY(snapshot) ?? currentCenter;
    const zoom = calculateZoom(targetY, course.goalY);
    const height = Math.min(course.viewportHeight / zoom, course.goalY);
    const halfHeight = height / 2;
    const targetCenter = clamp(targetY, halfHeight, course.goalY - halfHeight);

    this.centerY = clamp(
      currentCenter + (targetCenter - currentCenter) * FOLLOW_RATE,
      halfHeight,
      course.goalY - halfHeight,
    );

    return {
      centerY: this.centerY,
      topY: this.centerY - halfHeight,
      height,
      zoom,
    };
  }
}

function selectTargetY(snapshot: RaceSnapshot): number | null {
  const positions = snapshot.active
    .map(({ body }) => body.y)
    .filter(Number.isFinite);
  if (positions.length === 0) return null;

  return snapshot.winnerMode === 'first'
    ? Math.max(...positions)
    : Math.min(...positions);
}

function calculateZoom(targetY: number, goalY: number): number {
  const distanceToGoal = goalY - clamp(targetY, 0, goalY);
  const progress = clamp(
    (GOAL_ZOOM_DISTANCE - distanceToGoal) / GOAL_ZOOM_DISTANCE,
    0,
    1,
  );
  return 1 + progress * (MAX_ZOOM - 1);
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum);
}
