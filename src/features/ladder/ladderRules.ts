export type RandomSource = () => number;

export type LadderRow = number[];

export type Ladder = {
  columnCount: number;
  rows: LadderRow[];
};

export type LadderPoint = {
  row: number;
  column: number;
};

export type LadderTrace = {
  end: number;
  points: LadderPoint[];
};

export function ladderRowCount(columnCount: number): number {
  return Math.max(6, columnCount * 2);
}

export function generateLadder(columnCount: number, random: RandomSource): Ladder {
  if (!Number.isInteger(columnCount) || columnCount < 2) {
    throw new RangeError('columnCount must be an integer of at least 2');
  }

  const rowCount = ladderRowCount(columnCount);
  const rows = Array.from({ length: rowCount }, (_, rowIndex) => {
    if (rowIndex === rowCount - 1) return [];

    const links: number[] = [];
    for (let left = 0; left < columnCount - 1; left += 1) {
      if (links.at(-1) !== left - 1 && random() < 0.38) links.push(left);
    }
    return links;
  });

  return { columnCount, rows };
}

export function traceLadder(ladder: Ladder, start: number): LadderTrace {
  let column = start;
  const points: LadderPoint[] = [{ row: 0, column }];

  ladder.rows.forEach((row, index) => {
    const currentRow = index + 1;
    points.push({ row: currentRow, column });

    const left = row.find((link) => column === link || column === link + 1);
    if (left === undefined) return;

    column = column === left ? left + 1 : left;
    points.push({ row: currentRow, column });
  });

  return { end: column, points };
}

export function shuffleWith<T>(values: readonly T[], random: RandomSource): T[] {
  const shuffled = [...values];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[target]] = [shuffled[target], shuffled[index]];
  }

  return shuffled;
}
