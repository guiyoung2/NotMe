import type { MarbleSeed } from './marbleConfig';

export function marbleLabel(marble: MarbleSeed): string {
  const separator = marble.id.lastIndexOf(':');
  return `${marble.name} ${Number(marble.id.slice(separator + 1)) + 1}번 구슬`;
}

export function createMarbleColors(shuffledMarbles: readonly MarbleSeed[]): ReadonlyMap<string, string> {
  return new Map(shuffledMarbles.map(({ id }, index) => (
    [id, `hsl(${360 * index / shuffledMarbles.length} 100% 70%)`]
  )));
}
