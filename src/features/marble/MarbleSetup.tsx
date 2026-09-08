import type { FormEvent, JSX } from 'react';
import { useId, useRef, useState } from 'react';

import {
  expandMarbles,
  MAX_MARBLES,
  shuffleMarbles,
  validateMarbleParticipants,
  type MarbleParticipant,
  type MarbleSeed,
  type RandomSource,
} from './marbleConfig';
import type { WinnerMode } from './engine/RouletteEngine';
import './marble.css';

export type MarbleGameConfig = {
  participants: MarbleParticipant[];
  winnerMode: WinnerMode;
  skillsEnabled: boolean;
  shuffledMarbles: MarbleSeed[];
};

type MarbleSetupProps = {
  onStart: (config: MarbleGameConfig) => void;
  initialConfig?: MarbleGameConfig;
  onConfigChange?: (config: MarbleGameConfig) => void;
  random?: RandomSource;
};

function normalizeParticipants(participants: MarbleParticipant[]): MarbleParticipant[] {
  return participants.map((participant) => ({ ...participant, name: participant.name.trim() }));
}

function hasValidCount({ count }: MarbleParticipant): boolean {
  return Number.isInteger(count) && count >= 1 && count <= MAX_MARBLES;
}

export function MarbleSetup({
  onStart,
  initialConfig,
  onConfigChange,
  random = Math.random,
}: MarbleSetupProps): JSX.Element {
  const formId = useId();
  const nextParticipantNumber = useRef(3);
  const initialParticipants = useRef<MarbleParticipant[]>(
    initialConfig?.participants.map((participant) => ({ ...participant })) ?? [
      { id: `${formId}-participant-1`, name: '', count: 1 },
      { id: `${formId}-participant-2`, name: '', count: 1 },
    ],
  );
  const [participants, setParticipants] = useState(initialParticipants.current);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [winnerMode, setWinnerMode] = useState<WinnerMode>(initialConfig?.winnerMode ?? 'first');
  const [skillsEnabled, setSkillsEnabled] = useState(initialConfig?.skillsEnabled ?? false);
  const [shuffledMarbles, setShuffledMarbles] = useState(() => (
    initialConfig?.shuffledMarbles.map((marble) => ({ ...marble }))
      ?? shuffleMarbles(expandMarbles(normalizeParticipants(initialParticipants.current)), random)
  ));
  const validation = validateMarbleParticipants(participants);
  const canRemove = participants.length > 2;

  function commitParticipants(nextParticipants: MarbleParticipant[]) {
    const nextMarbles = shuffleMarbles(expandMarbles(normalizeParticipants(nextParticipants).filter(hasValidCount)), random);
    setParticipants(nextParticipants);
    setShuffledMarbles(nextMarbles);
    onConfigChange?.({
      participants: nextParticipants,
      winnerMode,
      skillsEnabled,
      shuffledMarbles: nextMarbles,
    });
  }

  function addParticipant() {
    const existingIds = new Set(participants.map(({ id }) => id));
    let number = nextParticipantNumber.current;
    let id = `${formId}-participant-${number}`;

    while (existingIds.has(id)) {
      number += 1;
      id = `${formId}-participant-${number}`;
    }

    nextParticipantNumber.current = number + 1;
    commitParticipants([
      ...participants,
      { id, name: '', count: 1 },
    ]);
  }

  function removeParticipant(id: string) {
    if (!canRemove) return;
    commitParticipants(participants.filter((participant) => participant.id !== id));
  }

  function updateParticipant(id: string, update: Partial<Pick<MarbleParticipant, 'name' | 'count'>>) {
    setTouched((current) => ({ ...current, [`${id}-${'name' in update ? 'name' : 'count'}`]: true }));
    commitParticipants(participants.map((participant) => (
      participant.id === id ? { ...participant, ...update } : participant
    )));
  }

  function updateCount(id: string, value: string) {
    if (value === '') {
      updateParticipant(id, { count: 0 });
      return;
    }

    const count = Number(value);
    updateParticipant(id, { count });
  }

  function shuffleCurrentMarbles() {
    const nextMarbles = shuffleMarbles(shuffledMarbles, random);
    setShuffledMarbles(nextMarbles);
    onConfigChange?.({ participants, winnerMode, skillsEnabled, shuffledMarbles: nextMarbles });
  }

  function changeWinnerMode(nextWinnerMode: WinnerMode) {
    setWinnerMode(nextWinnerMode);
    onConfigChange?.({ participants, winnerMode: nextWinnerMode, skillsEnabled, shuffledMarbles });
  }

  function changeSkillsEnabled(nextSkillsEnabled: boolean) {
    setSkillsEnabled(nextSkillsEnabled);
    onConfigChange?.({ participants, winnerMode, skillsEnabled: nextSkillsEnabled, shuffledMarbles });
  }

  function startRace(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!validation.valid) return;

    onStart({
      participants: normalizeParticipants(participants),
      winnerMode,
      skillsEnabled,
      shuffledMarbles,
    });
  }

  return (
    <form className="marble-setup" onSubmit={startRace}>
      <header className="marble-setup__intro">
        <h2>참가자와 구슬 설정</h2>
        <p>구슬 수만큼 당첨 기회가 늘어나요. 한 판에는 최대 {MAX_MARBLES}개까지 넣을 수 있어요.</p>
      </header>

      <ol className="marble-setup__participants" aria-label="참가자 목록">
        {participants.map((participant, index) => {
          const nameId = `${formId}-name-${participant.id}`;
          const countId = `${formId}-count-${participant.id}`;
          const count = participant.count;
          const nameError = touched[`${participant.id}-name`] && !participant.name.trim()
            ? '이름이 비어 있어요. 공백 외의 이름을 입력해 주세요.' : '';
          const countError = touched[`${participant.id}-count`] && !hasValidCount(participant)
            ? `${count ? '허용되지 않는 개수예요.' : '개수가 비어 있거나 0이에요.'} 1~${MAX_MARBLES} 사이의 정수를 입력해 주세요.` : '';

          return (
            <li className="marble-participant" key={participant.id}>
              <div className="marble-participant__name">
                <label htmlFor={nameId}>참가자 {index + 1} 이름</label>
                <input
                  id={nameId}
                  value={participant.name}
                  placeholder="이름"
                  aria-invalid={nameError ? true : undefined}
                  aria-describedby={nameError ? `${nameId}-error` : undefined}
                  onChange={(event) => updateParticipant(participant.id, { name: event.target.value })}
                  onBlur={() => setTouched((current) => ({ ...current, [`${participant.id}-name`]: true }))}
                />
                {nameError && <span className="marble-participant__error" id={`${nameId}-error`}>{nameError}</span>}
              </div>

              <div className="marble-participant__count">
                <label htmlFor={countId}>참가자 {index + 1} 구슬 수</label>
                <div className="marble-stepper">
                  <button
                    type="button"
                    aria-label={`참가자 ${index + 1} 구슬 감소`}
                    disabled={count <= 1}
                    onClick={() => updateParticipant(participant.id, { count: count - 1 })}
                  >
                    −
                  </button>
                  <input
                    id={countId}
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={MAX_MARBLES}
                    value={count || ''}
                    aria-invalid={countError ? true : undefined}
                    aria-describedby={countError ? `${countId}-error` : undefined}
                    onChange={(event) => updateCount(participant.id, event.target.value)}
                  />
                  <button
                    type="button"
                    aria-label={`참가자 ${index + 1} 구슬 증가`}
                    disabled={count >= MAX_MARBLES}
                    onClick={() => updateParticipant(participant.id, { count: count + 1 })}
                  >
                    +
                  </button>
                </div>
                {countError && <p className="marble-participant__error" id={`${countId}-error`}>{countError}</p>}
              </div>

              <button
                className="marble-part__remove"
                type="button"
                aria-label={`참가자 ${index + 1} 삭제`}
                disabled={!canRemove}
                onClick={() => removeParticipant(participant.id)}
              >
                삭제
              </button>
            </li>
          );
        })}
      </ol>

      <button className="marble-setup__add" type="button" onClick={addParticipant}>참가자 추가</button>

      <section className="marble-total" aria-live="polite">
        <output role="status" aria-label="전체 구슬 수">총 {validation.total}개</output>
        {!validation.valid && validation.overBy > 0 && (
          <p className="marble-total__error">{validation.overBy}개 줄여 주세요</p>
        )}
      </section>

      <div className="marble-options">
        <fieldset className="marble-segmented">
          <legend>당첨 구슬</legend>
          <div>
            <label>
              <input
                type="radio"
                name={`${formId}-winner`}
                value="first"
                checked={winnerMode === 'first'}
                onChange={() => changeWinnerMode('first')}
              />
              <span>첫 번째</span>
            </label>
            <label>
              <input
                type="radio"
                name={`${formId}-winner`}
                value="last"
                checked={winnerMode === 'last'}
                onChange={() => changeWinnerMode('last')}
              />
              <span>마지막</span>
            </label>
          </div>
        </fieldset>

        <label className="marble-switch">
          <span>
            <strong>스킬 사용</strong>
            <small>모든 구슬에 같은 조건으로 적용돼요.</small>
          </span>
          <input
            type="checkbox"
            role="switch"
            aria-label="스킬 사용"
            checked={skillsEnabled}
            onChange={(event) => changeSkillsEnabled(event.target.checked)}
          />
        </label>
      </div>

      <div className="marble-setup__actions">
        <button type="button" onClick={shuffleCurrentMarbles}>구슬 섞기</button>
        <button className="button--accent" type="submit" disabled={!validation.valid}>레이스 시작</button>
      </div>
    </form>
  );
}
