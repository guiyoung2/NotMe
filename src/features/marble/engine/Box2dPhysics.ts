/*!
 * Portions adapted from lazygyu/roulette.
 * Copyright (c) 2023 LazyGyu
 * @license MIT; Distributed at /licenses/lazygyu-roulette-MIT.txt.
 */

import Box2DFactory from 'box2d-wasm';
import standardWasmUrl from 'box2d-wasm/dist/es/Box2D.wasm?url';
import simdWasmUrl from 'box2d-wasm/dist/es/Box2D.simd.wasm?url';
import type { RandomSource } from '../marbleConfig';

import type {
  BodySnapshot,
  CourseDefinition,
  CourseObstacle,
  CoursePoint,
  DynamicObstacleSnapshot,
  PhysicsAdapter,
} from './types';

const MARBLE_RADIUS = 0.25;
const MARBLE_DENSITY = 1;
const MARBLE_RESTITUTION = 0.35;
const IMPACT_RADIUS = 10;
const IMPACT_IMPULSE = 2;
const IMPACT_DIRECTION_EPSILON = 0.000001;

type Box2DModule = typeof Box2D & EmscriptenModule;

let box2dModulePromise: Promise<Box2DModule> | null = null;

function getImpactDirection(sourceId: string, targetId: string): { x: number; y: number } {
  let hash = 2166136261;
  for (const character of `${sourceId}:${targetId}`) {
    hash = Math.imul(hash ^ character.charCodeAt(0), 16777619);
  }

  const angle = (hash >>> 0) / 4294967296 * Math.PI * 2;
  return { x: Math.cos(angle), y: Math.sin(angle) };
}

function locateBox2dFile(fileName: string): string {
  if (fileName === 'Box2D.wasm') return standardWasmUrl;
  if (fileName === 'Box2D.simd.wasm') return simdWasmUrl;
  return fileName;
}

function createBox2dModule(): Promise<Box2DModule> {
  if (typeof window === 'undefined') return Box2DFactory();
  return Box2DFactory({ locateFile: locateBox2dFile });
}

export class Box2dPhysics implements PhysicsAdapter {
  constructor(private readonly random: RandomSource = () => Math.random()) {}

  private box2d: Box2DModule | null = null;
  private world: Box2D.b2World | null = null;
  private initPromise: Promise<void> | null = null;
  private generation = 0;
  private readonly marbles = new Map<string, Box2D.b2Body>();
  private readonly courseBodies: Box2D.b2Body[] = [];
  private readonly spinners = new Map<string, { body: Box2D.b2Body; length: number }>();

  async init(): Promise<void> {
    if (this.world) return;
    if (this.initPromise) return this.initPromise;

    const generation = this.generation;
    const initPromise = this.initializeWorld(generation);
    this.initPromise = initPromise;
    try {
      await initPromise;
    } finally {
      if (this.initPromise === initPromise) this.initPromise = null;
    }
  }

  private async initializeWorld(generation: number): Promise<void> {
    box2dModulePromise ??= createBox2dModule().catch((error: unknown) => {
      box2dModulePromise = null;
      throw error;
    });
    const box2d = await box2dModulePromise;
    const gravity = new box2d.b2Vec2(0, 10);
    const world = new box2d.b2World(gravity);

    box2d.destroy(gravity);
    if (generation !== this.generation) {
      box2d.destroy(world);
      return;
    }

    this.box2d = box2d;
    this.world = world;
  }

  createCourse(course: CourseDefinition): void {
    this.clearCourse();
    for (const wall of course.walls) this.createLine(wall.from, wall.to);
    for (const section of course.sections) {
      for (const obstacle of section.obstacles) this.createObstacle(obstacle);
    }
    this.createLine(course.goalSensor.from, course.goalSensor.to, true);
  }

  createMarble(seed: { id: string; x: number; y: number }): void {
    this.removeMarble(seed.id);

    const { box2d, world } = this.requireWorld();
    const shape = new box2d.b2CircleShape();
    const bodyDefinition = new box2d.b2BodyDef();
    const fixtureDefinition = new box2d.b2FixtureDef();
    const position = new box2d.b2Vec2(seed.x, seed.y);

    shape.set_m_radius(MARBLE_RADIUS);
    bodyDefinition.set_type(box2d.b2_dynamicBody);
    bodyDefinition.set_position(position);
    fixtureDefinition.set_shape(shape);
    fixtureDefinition.set_density(MARBLE_DENSITY);
    fixtureDefinition.set_restitution(MARBLE_RESTITUTION);

    const body = world.CreateBody(bodyDefinition);
    const fixture = body.CreateFixture(fixtureDefinition);
    this.marbles.set(seed.id, body);

    box2d.LeakMitigator.freeFromCache(fixture);

    box2d.destroy(position);
    box2d.destroy(fixtureDefinition);
    box2d.destroy(bodyDefinition);
    box2d.destroy(shape);
  }

  step(seconds: number): void {
    this.requireWorld().world.Step(seconds, 6, 2);
  }

  getMarble(id: string): BodySnapshot | null {
    const body = this.marbles.get(id);
    if (!body) return null;

    const { box2d } = this.requireWorld();
    const position = body.GetPosition();
    try {
      return {
        id,
        x: position.x,
        y: position.y,
        angle: body.GetAngle(),
        radius: MARBLE_RADIUS,
      };
    } finally {
      box2d.LeakMitigator.freeFromCache(position);
    }
  }

  removeMarble(id: string): void {
    const body = this.marbles.get(id);
    if (!body) return;

    const { box2d, world } = this.requireWorld();
    world.DestroyBody(body);
    box2d.LeakMitigator.freeFromCache(body);
    this.marbles.delete(id);
  }

  shakeMarble(id: string): void {
    const body = this.marbles.get(id);
    if (!body) return;

    const { box2d } = this.requireWorld();
    const impulse = new box2d.b2Vec2(this.random() * 10 - 5, this.random() * 10 - 5);
    body.ApplyLinearImpulseToCenter(impulse, true);
    box2d.destroy(impulse);
  }

  impact(id: string): void {
    const source = this.marbles.get(id);
    if (!source) return;

    const { box2d } = this.requireWorld();
    const sourcePosition = source.GetPosition();
    try {
      for (const [targetId, target] of this.marbles) {
        if (targetId === id) continue;

        const targetPosition = target.GetPosition();
        try {
          const deltaX = targetPosition.x - sourcePosition.x;
          const deltaY = targetPosition.y - sourcePosition.y;
          const distance = Math.hypot(deltaX, deltaY);
          if (distance > IMPACT_RADIUS) continue;

          const direction = distance <= IMPACT_DIRECTION_EPSILON
            ? getImpactDirection(id, targetId)
            : { x: deltaX / distance, y: deltaY / distance };
          const strength = distance <= IMPACT_DIRECTION_EPSILON
            ? IMPACT_IMPULSE
            : (1 - distance / IMPACT_RADIUS) * IMPACT_IMPULSE;
          const impulse = new box2d.b2Vec2(direction.x * strength, direction.y * strength);
          target.ApplyLinearImpulseToCenter(impulse, true);
          box2d.destroy(impulse);
        } finally {
          box2d.LeakMitigator.freeFromCache(targetPosition);
        }
      }
    } finally {
      box2d.LeakMitigator.freeFromCache(sourcePosition);
    }
  }

  getDynamicObstacles(): DynamicObstacleSnapshot[] {
    const { box2d } = this.requireWorld();
    return [...this.spinners].map(([id, spinner]) => {
      const center = spinner.body.GetPosition();
      try {
        return {
          id,
          kind: 'spinner',
          center: { x: center.x, y: center.y },
          length: spinner.length,
          angle: spinner.body.GetAngle(),
        };
      } finally {
        box2d.LeakMitigator.freeFromCache(center);
      }
    });
  }

  destroy(): void {
    this.generation += 1;
    this.initPromise = null;
    if (!this.box2d || !this.world) return;

    for (const body of this.marbles.values()) this.destroyBody(body);
    this.clearCourse();
    this.marbles.clear();
    this.box2d.destroy(this.world);
    this.world = null;
    this.box2d = null;
  }

  private createObstacle(obstacle: CourseObstacle): void {
    switch (obstacle.kind) {
      case 'line':
        this.createLine(obstacle.from, obstacle.to);
        return;
      case 'circle':
        this.createCircle(obstacle.center, obstacle.radius);
        return;
      case 'spinner':
        this.createSpinner(obstacle);
    }
  }

  private createLine(from: CoursePoint, to: CoursePoint, sensor = false): void {
    const { box2d, world } = this.requireWorld();
    const bodyDefinition = new box2d.b2BodyDef();
    const shape = new box2d.b2EdgeShape();
    const fixtureDefinition = new box2d.b2FixtureDef();
    const fromVector = new box2d.b2Vec2(from.x, from.y);
    const toVector = new box2d.b2Vec2(to.x, to.y);

    shape.SetTwoSided(fromVector, toVector);
    fixtureDefinition.set_shape(shape);
    fixtureDefinition.set_isSensor(sensor);

    const body = world.CreateBody(bodyDefinition);
    const fixture = body.CreateFixture(fixtureDefinition);
    this.courseBodies.push(body);

    box2d.LeakMitigator.freeFromCache(fixture);

    box2d.destroy(toVector);
    box2d.destroy(fromVector);
    box2d.destroy(fixtureDefinition);
    box2d.destroy(shape);
    box2d.destroy(bodyDefinition);
  }

  private createCircle(center: CoursePoint, radius: number): void {
    const { box2d, world } = this.requireWorld();
    const bodyDefinition = new box2d.b2BodyDef();
    const shape = new box2d.b2CircleShape();
    const position = new box2d.b2Vec2(center.x, center.y);

    bodyDefinition.set_position(position);
    shape.set_m_radius(radius);

    const body = world.CreateBody(bodyDefinition);
    const fixture = body.CreateFixture(shape, 0);
    this.courseBodies.push(body);

    box2d.LeakMitigator.freeFromCache(fixture);

    box2d.destroy(position);
    box2d.destroy(shape);
    box2d.destroy(bodyDefinition);
  }

  private createSpinner(obstacle: Extract<CourseObstacle, { kind: 'spinner' }>): void {
    const { box2d, world } = this.requireWorld();
    const bodyDefinition = new box2d.b2BodyDef();
    const shape = new box2d.b2EdgeShape();
    const position = new box2d.b2Vec2(obstacle.center.x, obstacle.center.y);
    const from = new box2d.b2Vec2(-obstacle.length / 2, 0);
    const to = new box2d.b2Vec2(obstacle.length / 2, 0);

    bodyDefinition.set_type(box2d.b2_kinematicBody);
    bodyDefinition.set_position(position);
    bodyDefinition.set_angle(obstacle.angle);
    shape.SetTwoSided(from, to);

    const body = world.CreateBody(bodyDefinition);
    const fixture = body.CreateFixture(shape, 0);
    body.SetAngularVelocity(obstacle.angularVelocity);
    this.courseBodies.push(body);
    this.spinners.set(obstacle.id, { body, length: obstacle.length });

    box2d.LeakMitigator.freeFromCache(fixture);

    box2d.destroy(to);
    box2d.destroy(from);
    box2d.destroy(position);
    box2d.destroy(shape);
    box2d.destroy(bodyDefinition);
  }

  private requireWorld(): {
    box2d: Box2DModule;
    world: Box2D.b2World;
  } {
    if (!this.box2d || !this.world) {
      throw new Error('Box2D가 초기화되지 않았습니다.');
    }
    return { box2d: this.box2d, world: this.world };
  }

  private clearCourse(): void {
    for (const body of this.courseBodies) this.destroyBody(body);
    this.courseBodies.length = 0;
    this.spinners.clear();
  }

  private destroyBody(body: Box2D.b2Body): void {
    const { box2d, world } = this.requireWorld();
    world.DestroyBody(body);
    box2d.LeakMitigator.freeFromCache(body);
  }
}
