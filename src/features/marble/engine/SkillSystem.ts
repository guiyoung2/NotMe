import type { RandomSource } from '../marbleConfig';

export class SkillSystem {
  private remainingMs: number | null = null;

  constructor(private readonly random: RandomSource) {}

  update(ids: readonly string[], elapsedMs: number): string | null {
    if (ids.length === 0) return null;
    this.remainingMs ??= 6_000 + this.random() * 2_000;
    this.remainingMs -= elapsedMs;
    if (this.remainingMs > 0) return null;

    const id = ids[Math.min(ids.length - 1, Math.floor(this.random() * ids.length))];
    this.remainingMs = 6_000 + this.random() * 2_000;
    return id;
  }

  clear(): void {
    this.remainingMs = null;
  }
}
