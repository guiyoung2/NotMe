import type { MarbleSeed, RandomSource } from '../marbleConfig';
import { NOTME_COURSE } from './course';
import { SkillSystem } from './SkillSystem';
import type { BodySnapshot, DynamicObstacleSnapshot, PhysicsAdapter } from './types';

const FIXED_STEP_MS = 10;
const MAX_ACCUMULATOR_MS = 100;
const START_HORIZONTAL_GAP = 0.6;
const START_VERTICAL_GAP = 0.6;
const START_MARGIN_X = 1;
const START_Y = 1;
const STUCK_DURATION_MS = 3_000;
const STUCK_MOVEMENT_THRESHOLD = 0.1;

export type WinnerMode = 'first' | 'last';

export type FinishedMarble = MarbleSeed & {
  rank: number;
};

export type ActiveMarble = MarbleSeed & {
  body: BodySnapshot;
};

export type RaceSnapshot = {
  active: ActiveMarble[];
  dynamicObstacles: DynamicObstacleSnapshot[];
  finishOrder: FinishedMarble[];
  winner: FinishedMarble | null;
  winnerMode: WinnerMode;
  speed: 1 | 4;
};

export type RouletteEngineOptions = {
  physics: PhysicsAdapter;
  marbles: readonly MarbleSeed[];
  winnerMode: WinnerMode;
  skillsEnabled: boolean;
  random: RandomSource;
};

type StuckTracker = {
  x: number;
  y: number;
  elapsedMs: number;
};

export class RouletteEngine {
  private readonly physics: PhysicsAdapter;
  private readonly marbles: MarbleSeed[];
  private readonly seedById: Map<string, MarbleSeed>;
  private readonly winnerMode: WinnerMode;
  private readonly skillsEnabled: boolean;
  private readonly skillSystem: SkillSystem;
  private readonly activeIds = new Set<string>();
  private readonly finishedIds = new Set<string>();
  private readonly finishOrder: FinishedMarble[] = [];
  private readonly stuckTrackers = new Map<string, StuckTracker>();
  private accumulatorMs = 0;
  private speed: 1 | 4 = 1;
  private initialized = false;
  private destroyed = false;
  private initPromise: Promise<boolean> | null = null;

  constructor(options: RouletteEngineOptions) {
    this.physics = options.physics;
    this.marbles = options.marbles.map((marble) => ({ ...marble }));
    this.seedById = new Map(this.marbles.map((marble) => [marble.id, marble]));
    this.winnerMode = options.winnerMode;
    this.skillsEnabled = options.skillsEnabled;
    this.skillSystem = new SkillSystem(options.random);
  }

  init(): Promise<boolean> {
    if (this.destroyed) return Promise.resolve(false);
    if (this.initialized) return Promise.resolve(true);
    if (this.initPromise) return this.initPromise;

    const initializing = this.initialize();
    this.initPromise = initializing;
    return initializing.finally(() => {
      if (this.initPromise === initializing) this.initPromise = null;
    });
  }

  advance(deltaMs: number): void {
    if (
      !this.initialized
      || this.destroyed
      || this.finishOrder.length === this.marbles.length
      || !Number.isFinite(deltaMs)
      || deltaMs <= 0
    ) {
      return;
    }

    this.accumulatorMs = Math.min(
      this.accumulatorMs + deltaMs * this.speed,
      MAX_ACCUMULATOR_MS,
    );

    while (this.accumulatorMs >= FIXED_STEP_MS) {
      this.physics.step(FIXED_STEP_MS / 1_000);
      this.processStep();
      this.accumulatorMs -= FIXED_STEP_MS;

      if (this.finishOrder.length === this.marbles.length) {
        this.accumulatorMs = 0;
        break;
      }
    }
  }

  setFastForward(active: boolean): void {
    this.speed = active ? 4 : 1;
  }

  snapshot(): RaceSnapshot {
    const active = this.initialized && !this.destroyed
      ? this.marbles.flatMap((seed): ActiveMarble[] => {
        if (!this.activeIds.has(seed.id)) return [];
        const body = this.physics.getMarble(seed.id);
        return body ? [{ ...seed, body }] : [];
      })
      : [];
    const dynamicObstacles = this.initialized && !this.destroyed
      ? this.physics.getDynamicObstacles()
      : [];
    const winner = this.finishOrder.length === this.marbles.length
      ? this.finishOrder[this.winnerMode === 'first' ? 0 : this.finishOrder.length - 1] ?? null
      : null;

    return {
      active,
      dynamicObstacles,
      finishOrder: this.finishOrder.map((marble) => ({ ...marble })),
      winner: winner ? { ...winner } : null,
      winnerMode: this.winnerMode,
      speed: this.speed,
    };
  }

  destroy(): void {
    if (this.destroyed) return;

    this.destroyed = true;
    this.initialized = false;
    this.activeIds.clear();
    this.stuckTrackers.clear();
    this.skillSystem.clear();
    this.physics.destroy();
  }

  private async initialize(): Promise<boolean> {
    try {
      await this.physics.init();
      if (this.destroyed) return false;

      this.physics.createCourse(NOTME_COURSE);
      const positions = createStartPositions(this.marbles.length);
      for (const [index, marble] of this.marbles.entries()) {
        const position = positions[index];
        this.physics.createMarble({ id: marble.id, ...position });
        this.activeIds.add(marble.id);
        this.stuckTrackers.set(marble.id, { ...position, elapsedMs: 0 });
      }
      this.skillSystem.register(this.marbles.map(({ id }) => id));
      this.initialized = true;
      return true;
    } catch (error) {
      if (!this.destroyed) this.physics.destroy();
      throw error;
    }
  }

  private processStep(): void {
    const activeBodies = new Map<string, BodySnapshot>();
    for (const marble of this.marbles) {
      if (!this.activeIds.has(marble.id)) continue;
      const body = this.physics.getMarble(marble.id);
      if (body) activeBodies.set(marble.id, body);
    }

    for (const marble of this.marbles) {
      const body = activeBodies.get(marble.id);
      if (body && body.y >= NOTME_COURSE.goalY) this.finish(marble.id);
    }

    if (this.activeIds.size === 1 && this.finishOrder.length === this.marbles.length - 1) {
      const lastId = this.activeIds.values().next().value;
      if (lastId) this.finish(lastId);
    }

    if (this.finishOrder.length === this.marbles.length) return;

    const remainingIds = this.marbles
      .map(({ id }) => id)
      .filter((id) => this.activeIds.has(id));
    if (this.skillsEnabled) {
      this.skillSystem.update(remainingIds, FIXED_STEP_MS, this.physics);
    }
    for (const id of remainingIds) {
      const body = activeBodies.get(id);
      if (body) this.updateStuckTracker(id, body);
    }
  }

  private finish(id: string): void {
    if (this.finishedIds.has(id)) return;
    const seed = this.seedById.get(id);
    if (!seed) return;

    this.finishedIds.add(id);
    this.activeIds.delete(id);
    this.stuckTrackers.delete(id);
    this.skillSystem.remove(id);
    this.finishOrder.push({ ...seed, rank: this.finishOrder.length + 1 });
    this.physics.removeMarble(id);
  }

  private updateStuckTracker(id: string, body: BodySnapshot): void {
    const tracker = this.stuckTrackers.get(id);
    if (!tracker) {
      this.stuckTrackers.set(id, { x: body.x, y: body.y, elapsedMs: 0 });
      return;
    }

    if (Math.hypot(body.x - tracker.x, body.y - tracker.y) >= STUCK_MOVEMENT_THRESHOLD) {
      tracker.x = body.x;
      tracker.y = body.y;
      tracker.elapsedMs = 0;
      return;
    }

    tracker.elapsedMs += FIXED_STEP_MS;
    if (tracker.elapsedMs < STUCK_DURATION_MS) return;

    this.physics.shakeMarble(id);
    tracker.x = body.x;
    tracker.y = body.y;
    tracker.elapsedMs = 0;
  }
}

function createStartPositions(count: number): Array<{ x: number; y: number }> {
  const usableWidth = NOTME_COURSE.width - START_MARGIN_X * 2;
  const columns = Math.max(1, Math.floor(usableWidth / START_HORIZONTAL_GAP) + 1);

  return Array.from({ length: count }, (_, index) => {
    const row = Math.floor(index / columns);
    const column = index % columns;
    const rowCount = Math.min(columns, count - row * columns);
    const rowWidth = (rowCount - 1) * START_HORIZONTAL_GAP;

    return {
      x: (NOTME_COURSE.width - rowWidth) / 2 + column * START_HORIZONTAL_GAP,
      y: START_Y + row * START_VERTICAL_GAP,
    };
  });
}
