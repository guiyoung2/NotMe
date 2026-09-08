import type { JSX } from 'react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { GameShell } from '../../app/GameShell';
import { clearDraft, loadDraft, saveDraft } from '../../shared/draftStorage';
import { MarbleRace } from './MarbleRace';
import { MarbleSetup, type MarbleGameConfig } from './MarbleSetup';
import { validateMarbleParticipants, type MarbleSeed } from './marbleConfig';
import type { FinishedMarble, RaceSnapshot } from './engine/RouletteEngine';
import './marble.css';

export type MarbleDraft =
  | { phase: 'setup'; config: MarbleGameConfig }
  | { phase: 'racing'; config: MarbleGameConfig }
  | { phase: 'result'; config: MarbleGameConfig; finishOrder: FinishedMarble[] };

type MarblePageState =
  | { phase: 'setup'; config?: MarbleGameConfig; interrupted: boolean }
  | { phase: 'racing'; config: MarbleGameConfig; session: number }
  | { phase: 'result'; config: MarbleGameConfig; finishOrder: FinishedMarble[] }
  | { phase: 'error'; config: MarbleGameConfig };

const CONFIG_KEYS = new Set(['participants', 'winnerMode', 'skillsEnabled', 'shuffledMarbles']);
const PARTICIPANT_KEYS = new Set(['id', 'name', 'count']);
const MARBLE_KEYS = new Set(['id', 'participantId', 'name']);
const FINISHED_MARBLE_KEYS = new Set([...MARBLE_KEYS, 'rank']);

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function hasExactKeys(value: Record<string, unknown>, keys: ReadonlySet<string>): boolean {
  const actualKeys = Object.keys(value);
  return actualKeys.length === keys.size && actualKeys.every((key) => keys.has(key));
}

function isMarbleSeedShape(value: unknown, keys: ReadonlySet<string>): value is MarbleSeed {
  return isPlainObject(value)
    && hasExactKeys(value, keys)
    && typeof value.id === 'string'
    && typeof value.participantId === 'string'
    && typeof value.name === 'string';
}

function isFinishedMarbleShape(value: unknown): value is FinishedMarble {
  return isMarbleSeedShape(value, FINISHED_MARBLE_KEYS)
    && 'rank' in value
    && Number.isInteger(value.rank);
}

function isMarbleGameConfig(value: unknown, requirePlayableNames: boolean): value is MarbleGameConfig {
  if (!isPlainObject(value) || !hasExactKeys(value, CONFIG_KEYS)) return false;
  if (value.winnerMode !== 'first' && value.winnerMode !== 'last') return false;
  if (typeof value.skillsEnabled !== 'boolean' || !Array.isArray(value.participants)) return false;
  if (value.participants.length < 2 || !Array.isArray(value.shuffledMarbles)) return false;

  const participants = value.participants;
  if (!participants.every((participant) => (
    isPlainObject(participant)
    && hasExactKeys(participant, PARTICIPANT_KEYS)
    && typeof participant.id === 'string'
    && participant.id.trim().length > 0
    && typeof participant.name === 'string'
    && Number.isInteger(participant.count)
    && (participant.count as number) >= 1
    && (participant.count as number) <= 100
  ))) {
    return false;
  }

  const typedParticipants = participants as MarbleGameConfig['participants'];
  if (new Set(typedParticipants.map(({ id }) => id)).size !== typedParticipants.length) return false;
  const total = typedParticipants.reduce((sum, { count }) => sum + count, 0);
  if (total < 2 || total > 100 || value.shuffledMarbles.length !== total) return false;
  if (requirePlayableNames && !validateMarbleParticipants(typedParticipants).valid) return false;

  const participantById = new Map(typedParticipants.map((participant) => [participant.id, participant]));
  const expectedParticipantById = new Map<string, string>(typedParticipants.flatMap(({ id, count }) => (
    Array.from({ length: count }, (_, index) => [`${id}:${index}`, id] as const)
  )));
  const seenIds = new Set<string>();

  for (const marble of value.shuffledMarbles) {
    if (!isMarbleSeedShape(marble, MARBLE_KEYS)) return false;
    const participant = participantById.get(marble.participantId);
    if (
      !participant
      || expectedParticipantById.get(marble.id) !== marble.participantId
      || marble.name !== participant.name.trim()
      || seenIds.has(marble.id)
    ) {
      return false;
    }
    seenIds.add(marble.id);
  }

  return seenIds.size === expectedParticipantById.size;
}

function isFinishOrder(value: unknown, config: MarbleGameConfig): value is FinishedMarble[] {
  if (!Array.isArray(value) || value.length !== config.shuffledMarbles.length) return false;
  const seedById = new Map(config.shuffledMarbles.map((seed) => [seed.id, seed]));
  const seenIds = new Set<string>();

  return value.every((finished, index) => {
    if (!isFinishedMarbleShape(finished) || finished.rank !== index + 1) {
      return false;
    }
    const seed = seedById.get(finished.id);
    if (
      !seed
      || seenIds.has(finished.id)
      || finished.participantId !== seed.participantId
      || finished.name !== seed.name
    ) {
      return false;
    }
    seenIds.add(finished.id);
    return true;
  });
}

export function isMarbleDraft(value: unknown): value is MarbleDraft {
  if (!isPlainObject(value) || typeof value.phase !== 'string') return false;

  if (value.phase === 'setup' || value.phase === 'racing') {
    return hasExactKeys(value, new Set(['phase', 'config']))
      && isMarbleGameConfig(value.config, value.phase === 'racing');
  }

  if (value.phase !== 'result' || !hasExactKeys(value, new Set(['phase', 'config', 'finishOrder']))) {
    return false;
  }
  return isMarbleGameConfig(value.config, true) && isFinishOrder(value.finishOrder, value.config);
}

function restorePage(): MarblePageState {
  const draft = loadDraft('marble', isMarbleDraft);
  if (!draft) return { phase: 'setup', interrupted: false };
  if (draft.phase === 'racing') {
    return { phase: 'setup', config: draft.config, interrupted: true };
  }
  if (draft.phase === 'result') return draft;
  return { ...draft, interrupted: false };
}

function isDefaultSetup(config: MarbleGameConfig | undefined): boolean {
  return config === undefined || (
    config.participants.length === 2
    && config.participants.every(({ name, count }) => name.length === 0 && count === 1)
    && config.winnerMode === 'first'
    && !config.skillsEnabled
  );
}

function marbleNumber(marble: MarbleSeed): number {
  const separator = marble.id.lastIndexOf(':');
  return Number(marble.id.slice(separator + 1)) + 1;
}

export function MarblePage(): JSX.Element {
  const navigate = useNavigate();
  const [page, setPage] = useState<MarblePageState>(restorePage);
  const [setupKey, setSetupKey] = useState(0);
  const nextSession = useRef(0);
  const activeSession = useRef<number | null>(null);

  useEffect(() => {
    if (page.phase === 'setup' && page.interrupted && page.config) {
      saveDraft('marble', { phase: 'setup', config: page.config } satisfies MarbleDraft);
    }
  }, []);

  function reset() {
    activeSession.current = null;
    clearDraft('marble');
    setSetupKey((current) => current + 1);
    setPage({ phase: 'setup', interrupted: false });
  }

  function updateSetup(config: MarbleGameConfig) {
    const nextDraft = { phase: 'setup', config } satisfies MarbleDraft;
    saveDraft('marble', nextDraft);
    setPage({ ...nextDraft, interrupted: false });
  }

  function startRace(config: MarbleGameConfig) {
    const session = nextSession.current + 1;
    nextSession.current = session;
    activeSession.current = session;
    saveDraft('marble', { phase: 'racing', config } satisfies MarbleDraft);
    setPage({ phase: 'racing', config, session });
  }

  function finishRace(session: number, config: MarbleGameConfig, snapshot: RaceSnapshot) {
    if (activeSession.current !== session) return;
    activeSession.current = null;
    const resultDraft = { phase: 'result', config, finishOrder: snapshot.finishOrder } as const;
    if (!isMarbleDraft(resultDraft)) {
      setPage({ phase: 'error', config });
      return;
    }
    saveDraft('marble', resultDraft);
    setPage(resultDraft);
  }

  function abortRace(session: number, config: MarbleGameConfig) {
    if (activeSession.current !== session) return;
    activeSession.current = null;
    saveDraft('marble', { phase: 'setup', config } satisfies MarbleDraft);
    setPage({ phase: 'setup', config, interrupted: false });
  }

  function failRace(session: number, config: MarbleGameConfig) {
    if (activeSession.current !== session) return;
    activeSession.current = null;
    setPage({ phase: 'error', config });
  }

  function retryRace(config: MarbleGameConfig) {
    startRace(config);
  }

  function returnToSetup(config: MarbleGameConfig) {
    activeSession.current = null;
    saveDraft('marble', { phase: 'setup', config } satisfies MarbleDraft);
    setPage({ phase: 'setup', config, interrupted: false });
  }

  const dirty = page.phase !== 'setup' || !isDefaultSetup(page.config);

  return (
    <GameShell title="마블 룰렛" dirty={dirty} onReset={reset}>
      {page.phase === 'setup' ? (
        <div className="marble-page">
          {page.interrupted && (
            <p className="marble-page__notice" role="status">진행 중이던 레이스는 다시 시작해 주세요</p>
          )}
          <MarbleSetup
            key={setupKey}
            initialConfig={page.config}
            onConfigChange={updateSetup}
            onStart={startRace}
          />
        </div>
      ) : page.phase === 'racing' ? (
        <MarbleRace
          key={page.session}
          config={page.config}
          onFinish={(snapshot) => finishRace(page.session, page.config, snapshot)}
          onAbort={() => abortRace(page.session, page.config)}
          onError={() => failRace(page.session, page.config)}
        />
      ) : page.phase === 'result' ? (
        <MarbleResult
          config={page.config}
          finishOrder={page.finishOrder}
          onRestart={() => returnToSetup(page.config)}
        />
      ) : (
        <section className="marble-error">
          <h2>룰렛을 불러오지 못했어요</h2>
          <p>레이스를 다시 시작하거나 설정을 초기화해 주세요.</p>
          <div className="marble-error__actions">
            <button className="button--accent" type="button" onClick={() => retryRace(page.config)}>다시 시도</button>
            <button
              type="button"
              onClick={() => {
                reset();
                navigate('/');
              }}
            >
              홈으로 돌아가기
            </button>
          </div>
        </section>
      )}
    </GameShell>
  );
}

type MarbleResultProps = {
  config: MarbleGameConfig;
  finishOrder: FinishedMarble[];
  onRestart: () => void;
};

function MarbleResult({ config, finishOrder, onRestart }: MarbleResultProps): JSX.Element {
  const winner = config.winnerMode === 'first' ? finishOrder[0] : finishOrder.at(-1);
  const winnerParticipant = config.participants.find(({ id }) => id === winner?.participantId);

  return (
    <section className="marble-result">
      <header className="marble-result__selected">
        <p>{config.winnerMode === 'first' ? '첫 번째' : '마지막'} 도착 구슬</p>
        <h2>{winnerParticipant?.name} 님이 당첨됐어요</h2>
        {winner && (
          <strong className="marble-result__winner-marble">
            {winner.name} {marbleNumber(winner)}번 구슬
          </strong>
        )}
      </header>

      <ol className="marble-result__ranking" aria-label="전체 도착 순위">
        {finishOrder.map((marble) => (
          <li className={marble.id === winner?.id ? 'marble-result__winner-row' : undefined} key={marble.id}>
            <span>{marble.rank}위</span>
            <strong>{marble.name} {marbleNumber(marble)}번 구슬</strong>
          </li>
        ))}
      </ol>

      <button className="button--accent marble-result__restart" type="button" onClick={onRestart}>다시 하기</button>
    </section>
  );
}
