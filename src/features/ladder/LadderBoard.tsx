import type { CSSProperties, JSX } from 'react';
import { useId } from 'react';

import { traceLadder, type Ladder } from './ladderRules';
import './ladder.css';

const COLUMN_GAP = 72;
const ROW_GAP = 44;

type LadderBoardProps = {
  ladder: Ladder;
  names: string[];
  outcomes: string[];
  revealedStarts: number[];
  activeStart: number | null;
  onSelect: (start: number) => void;
};

export function LadderBoard({
  ladder,
  names,
  outcomes,
  revealedStarts,
  activeStart,
  onSelect,
}: LadderBoardProps): JSX.Element {
  const titleId = useId();
  const descriptionId = useId();
  const boardWidth = ladder.columnCount * COLUMN_GAP;
  const boardHeight = (ladder.rows.length + 1) * ROW_GAP;
  const lastRow = ladder.rows.length;
  const gridStyle = {
    '--ladder-columns': ladder.columnCount,
    '--ladder-width': `${boardWidth}px`,
  } as CSSProperties;
  const startsByEnd = Array.from({ length: ladder.columnCount }, () => -1);

  names.forEach((_, start) => {
    startsByEnd[traceLadder(ladder, start).end] = start;
  });

  const activeTrace = activeStart === null ? null : traceLadder(ladder, activeStart);
  const activePoints = activeTrace?.points
    .map(({ row, column }) => `${column * COLUMN_GAP},${row * ROW_GAP}`)
    .join(' ');

  return (
    <section className="ladder-board" aria-label="사다리 결과">
      <div className="ladder-board__scroll">
        <div className="ladder-board__content" style={gridStyle}>
          <ol className="ladder-board__labels ladder-board__labels--names" aria-label="참가자">
            {names.map((name, start) => (
              <li key={start}>
                <button
                  className="ladder-board__endpoint"
                  type="button"
                  aria-label={`${name} 경로 보기`}
                  aria-pressed={activeStart === start}
                  onClick={() => onSelect(start)}
                >
                  {name}
                </button>
              </li>
            ))}
          </ol>

          <svg
            className="ladder-board__svg"
            role="img"
            aria-labelledby={titleId}
            aria-describedby={descriptionId}
            viewBox={`${-COLUMN_GAP / 2} ${-ROW_GAP / 2} ${boardWidth} ${boardHeight}`}
            style={{ minWidth: `${boardWidth}px` }}
          >
            <title id={titleId}>사다리 경로</title>
            <desc id={descriptionId}>
              {names.length}명의 참가자를 {outcomes.length}개의 결과와 연결하는 사다리입니다.
            </desc>
            <g className="ladder-board__lines" aria-hidden="true">
              {Array.from({ length: ladder.columnCount }, (_, column) => (
                <line
                  key={column}
                  x1={column * COLUMN_GAP}
                  y1={0}
                  x2={column * COLUMN_GAP}
                  y2={lastRow * ROW_GAP}
                />
              ))}
              {ladder.rows.flatMap((row, rowIndex) => row.map((left) => (
                <line
                  key={`${rowIndex}-${left}`}
                  x1={left * COLUMN_GAP}
                  y1={(rowIndex + 1) * ROW_GAP}
                  x2={(left + 1) * COLUMN_GAP}
                  y2={(rowIndex + 1) * ROW_GAP}
                />
              )))}
            </g>
            {activePoints && (
              <polyline
                key={activeStart}
                className="ladder-board__active-path"
                aria-hidden="true"
                points={activePoints}
                pathLength="1"
              />
            )}
          </svg>

          <ol className="ladder-board__labels ladder-board__labels--results" aria-label="결과">
            {outcomes.map((outcome, end) => {
              const start = startsByEnd[end];
              const isRevealed = revealedStarts.includes(start);

              return (
                <li key={end}>
                  <button
                    className="ladder-board__endpoint ladder-board__result"
                    type="button"
                    aria-label={isRevealed ? `${outcome} 경로 보기` : `결과 ${end + 1} 경로 보기`}
                    aria-pressed={activeStart === start}
                    onClick={() => onSelect(start)}
                  >
                    {isRevealed ? outcome : '?'}
                  </button>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </section>
  );
}
