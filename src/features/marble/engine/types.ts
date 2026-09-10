export interface CoursePoint {
  x: number;
  y: number;
}

export interface LineObstacle {
  kind: 'line';
  from: CoursePoint;
  to: CoursePoint;
}

export interface CircleObstacle {
  kind: 'circle';
  center: CoursePoint;
  radius: number;
}

export interface SpinnerObstacle {
  kind: 'spinner';
  id: string;
  center: CoursePoint;
  length: number;
  angle: number;
  angularVelocity: number;
}

export type CourseObstacle = LineObstacle | CircleObstacle | SpinnerObstacle;

export type CourseSectionKind = 'ramps' | 'pins' | 'spinner' | 'fork' | 'finish';

export interface CourseSection {
  kind: CourseSectionKind;
  obstacles: CourseObstacle[];
}

export interface CourseDefinition {
  width: number;
  viewportHeight: number;
  goalY: number;
  walls: LineObstacle[];
  sections: CourseSection[];
  goalSensor: Omit<LineObstacle, 'kind'>;
}

export interface BodySnapshot {
  id: string;
  x: number;
  y: number;
  angle: number;
  radius: number;
}

export interface DynamicObstacleSnapshot {
  id: string;
  kind: 'spinner';
  center: CoursePoint;
  length: number;
  angle: number;
}

export interface SkillEffectSnapshot {
  id: number;
  center: CoursePoint;
  elapsedMs: number;
  durationMs: 500;
}

export interface PhysicsAdapter {
  init(): Promise<void>;
  createCourse(course: CourseDefinition): void;
  createMarble(seed: { id: string; x: number; y: number }): void;
  step(seconds: number): void;
  getMarble(id: string): BodySnapshot | null;
  removeMarble(id: string): void;
  shakeMarble(id: string): void;
  impact(id: string): void;
  getDynamicObstacles(): DynamicObstacleSnapshot[];
  destroy(): void;
}
