import type { JSX } from 'react';
import { useState } from 'react';

import { GameShell } from '../../app/GameShell';
import { clearDraft, loadDraft, saveDraft } from '../../shared/draftStorage';
import { LadderBoard } from './LadderBoard';
import { LadderSetup, type LadderSetupValue } from './LadderSetup';
import { generateLadder, ladderRowCount, traceLadder, type Ladder } from './ladderRules';

export type LadderDraft = {
  phase: 'setup' | 'playing';
  names: string[];
  outcomes: string[];
  ladder: Ladder | null;
  revealedStarts: number[];
};

const LADDER_DRAFT_KEYS = new Set([
  'phase',
  'names',
  'outcomes',
  'ladder',
  'revealedStarts',
]);

function createInitialDraft(): LadderDraft {
  return {
    phase: 'setup',
    names: ['', ''],
    outcomes: ['', ''],
    ladder: null,
    revealedStarts: [],
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function isValidLadder(value: unknown, columnCount: number): value is Ladder {
  if (!isRecord(value) || value.columnCount !== columnCount || !Number.isInteger(value.columnCount)) {
    return false;
  }

  if (!Array.isArray(value.rows) || value.rows.length !== ladderRowCount(columnCount)) return false;

  return value.rows.every((row) => {
    if (!Array.isArray(row)) return false;
    if (!row.every((link) => Number.isInteger(link) && link >= 0 && link < columnCount - 1)) {
      return false;
    }

    return row.every((link, index) => row.every((otherLink, otherIndex) => (
      index === otherIndex || Math.abs(link - otherLink) > 1
    )));
  });
}

function isValidRevealedStarts(value: unknown, columnCount: number): value is number[] {
  if (!Array.isArray(value)) return false;
  if (!value.every((index) => Number.isInteger(index) && index >= 0 && index < columnCount)) {
    return false;
  }
  return new Set(value).size === value.length;
}

export function isLadderDraft(value: unknown): value is LadderDraft {
  if (!isRecord(value)) return false;

  const keys = Object.keys(value);
  if (keys.length !== LADDER_DRAFT_KEYS.size || keys.some((key) => !LADDER_DRAFT_KEYS.has(key))) {
    return false;
  }

  if (!isStringArray(value.names) || !isStringArray(value.outcomes)) {
    return false;
  }

  const { names, outcomes } = value;
  if (names.length < 2 || names.length !== outcomes.length) return false;
  if (!isValidRevealedStarts(value.revealedStarts, names.length)) return false;

  if (value.phase === 'setup') {
    return value.ladder === null && value.revealedStarts.length === 0;
  }

  if (value.phase !== 'playing') return false;
  if (![...names, ...outcomes].every((item) => item.trim().length > 0)) return false;

  return isValidLadder(value.ladder, names.length);
}

export function LadderPage(): JSX.Element {
  const [draft, setDraft] = useState<LadderDraft>(() => (
    loadDraft('ladder', isLadderDraft) ?? createInitialDraft()
  ));
  const [activeStart, setActiveStart] = useState<number | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const dirty = draft.phase === 'playing'
    || draft.names.some((name) => name.length > 0)
    || draft.outcomes.some((outcome) => outcome.length > 0);

  function persistDraft(nextDraft: LadderDraft) {
    setDraft(nextDraft);
    saveDraft('ladder', nextDraft);
  }

  function reset() {
    clearDraft('ladder');
    setDraft(createInitialDraft());
    setActiveStart(null);
    setAnnouncement('');
  }

  function updateSetup(value: LadderSetupValue) {
    persistDraft({
      phase: 'setup',
      names: value.names,
      outcomes: value.outcomes,
      ladder: null,
      revealedStarts: [],
    });
  }

  function startGame() {
    const names = draft.names.map((name) => name.trim());
    const outcomes = draft.outcomes.map((outcome) => outcome.trim());
    if (
      names.length < 2
      || names.length !== outcomes.length
      || [...names, ...outcomes].some((item) => item.length === 0)
    ) {
      return;
    }

    const nextDraft: LadderDraft = {
      phase: 'playing',
      names,
      outcomes,
      ladder: generateLadder(names.length, Math.random),
      revealedStarts: [],
    };
    setActiveStart(null);
    setAnnouncement('');
    persistDraft(nextDraft);
  }

  function revealStart(start: number) {
    if (
      draft.phase !== 'playing'
      || !draft.ladder
      || !Number.isInteger(start)
      || start < 0
      || start >= draft.names.length
    ) {
      return;
    }

    setActiveStart(start);
    const end = traceLadder(draft.ladder, start).end;
    setAnnouncement(`${draft.names[start]}: ${draft.outcomes[end]}`);
    if (draft.revealedStarts.includes(start)) return;

    persistDraft({
      ...draft,
      revealedStarts: [...draft.revealedStarts, start],
    });
  }

  function revealAll() {
    if (draft.phase !== 'playing' || !draft.ladder) return;
    const ladder = draft.ladder;
    const results = draft.names.map((name, start) => {
      const end = traceLadder(ladder, start).end;
      return `${name}: ${draft.outcomes[end]}`;
    });
    setAnnouncement(`전체 결과: ${results.join(', ')}`);
    persistDraft({
      ...draft,
      revealedStarts: Array.from({ length: draft.names.length }, (_, index) => index),
    });
  }

  return (
    <GameShell title="사다리 타기" dirty={dirty} onReset={reset}>
      <div className="ladder-page">
        {draft.phase === 'setup' ? (
          <LadderSetup value={draft} onChange={updateSetup} onStart={startGame} />
        ) : draft.ladder ? (
          <section className="ladder-play">
            <header className="ladder-play__intro">
              <h2>이름을 눌러 결과를 확인하세요</h2>
              <p>원하는 참가자부터 하나씩 경로를 따라갈 수 있어요.</p>
            </header>
            <p className="ladder-play__status" role="status" aria-live="polite">{announcement}</p>
            <LadderBoard
              ladder={draft.ladder}
              names={draft.names}
              outcomes={draft.outcomes}
              revealedStarts={draft.revealedStarts}
              activeStart={activeStart}
              onSelect={revealStart}
            />
            <button className="button--accent ladder-play__reveal-all" type="button" onClick={revealAll}>
              전체 결과 보기
            </button>
          </section>
        ) : null}
      </div>
    </GameShell>
  );
}
