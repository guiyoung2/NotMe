import type { RaceSnapshot } from './RouletteEngine';
import type { CourseDefinition } from './types';

const FOLLOW_RATE = 0.1;
const GOAL_ZOOM_DISTANCE = 12;
const MAX_ZOOM = 2;

export type CameraView = {
  /** 화면 왼쪽과 가시 폭의 월드 좌표 */
  leftX: number;
  width: number;
  /** 현재 화면 중심의 코스 월드 y 좌표 */
  centerY: number;
  /** 현재 화면 상단의 코스 월드 y 좌표 */
  topY: number;
  /** 현재 화면에 보이는 코스 월드 높이 */
  height: number;
  zoom: number;
};

export class Camera {
  private view: CameraView | null = null;

  update(
    snapshot: RaceSnapshot,
    course: CourseDefinition,
    viewport?: { width: number; height: number },
  ): CameraView {
    const aspectRatio = viewport ? viewport.width / viewport.height : null;
    const minimumHeight = aspectRatio ? (course.width + 1) / aspectRatio : 0;
    const targetY = selectTargetY(snapshot);
    const zoom = targetY === null ? this.view?.zoom ?? 1 : calculateZoom(targetY, course.goalY);
    const height = Math.max(Math.min(course.viewportHeight / zoom, course.goalY), minimumHeight);
    const width = aspectRatio ? height * aspectRatio : course.width;
    const halfHeight = height / 2;
    const currentCenter = this.view?.centerY ?? Math.max(course.viewportHeight, minimumHeight) / 2;
    const targetCenter = clamp(targetY ?? currentCenter, halfHeight, course.goalY - halfHeight);
    const followedCenter = currentCenter + (targetCenter - currentCenter) * FOLLOW_RATE;
    // 급격한 선두 교체나 배속 중에도 추적 구슬 전체가 화면에 남도록 보간 범위를 제한한다.
    const visibleCenter = targetY === null
      ? currentCenter
      : clamp(followedCenter, targetY - halfHeight + 0.25, targetY + halfHeight - 0.25);
    const centerY = height >= course.goalY ? course.goalY / 2 : clamp(
      visibleCenter,
      halfHeight,
      course.goalY - halfHeight,
    );

    this.view = {
      leftX: (course.width - width) / 2,
      width,
      centerY,
      topY: centerY - halfHeight,
      height,
      zoom,
    };
    return { ...this.view };
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
