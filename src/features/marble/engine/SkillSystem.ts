import type { RandomSource } from '../marbleConfig';
import type { PhysicsAdapter } from './types';

const SKILL_COOLDOWN_MS = 5_000;
const SKILL_TRIGGER_PROBABILITY = 0.02;

export class SkillSystem {
  private readonly elapsedById = new Map<string, number>();

  constructor(private readonly random: RandomSource) {}

  register(ids: readonly string[]): void {
    for (const id of ids) this.elapsedById.set(id, 0);
  }

  remove(id: string): void {
    this.elapsedById.delete(id);
  }

  update(ids: readonly string[], elapsedMs: number, physics: PhysicsAdapter): void {
    for (const id of ids) {
      const elapsed = (this.elapsedById.get(id) ?? 0) + elapsedMs;
      if (elapsed < SKILL_COOLDOWN_MS) {
        this.elapsedById.set(id, elapsed);
        continue;
      }

      this.elapsedById.set(id, elapsed - SKILL_COOLDOWN_MS);
      if (this.random() < SKILL_TRIGGER_PROBABILITY) physics.impact(id);
    }
  }

  clear(): void {
    this.elapsedById.clear();
  }
}
