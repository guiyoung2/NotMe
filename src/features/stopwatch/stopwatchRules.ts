export interface ScoredPlayer {
  id: string;
  score: number;
}

export const lastHundredthDigit = (elapsedMs: number): number => Math.floor(Math.max(0, elapsedMs) / 10) % 10;

export const multiplyDigits = ([first, second]: readonly [number, number]): number => first * second;

export function lowestPlayerIds(players: readonly ScoredPlayer[]): string[] {
  const minimum = Math.min(...players.map(({ score }) => score));
  return players.filter(({ score }) => score === minimum).map(({ id }) => id);
}
