import type { FormEvent, JSX } from 'react';
import { useId } from 'react';

import { shuffleWith } from './ladderRules';
import './ladderSetup.css';

export type LadderSetupValue = {
  names: string[];
  outcomes: string[];
};

type LadderSetupProps = {
  value: LadderSetupValue;
  onChange: (value: LadderSetupValue) => void;
  onStart: () => void;
};

export function LadderSetup({ value, onChange, onStart }: LadderSetupProps): JSX.Element {
  const formId = useId();
  const canRemove = value.names.length > 2;
  const canStart = value.names.length >= 2
    && value.names.length === value.outcomes.length
    && [...value.names, ...value.outcomes].every((item) => item.trim().length > 0);

  function addLadder() {
    onChange({
      names: [...value.names, ''],
      outcomes: [...value.outcomes, ''],
    });
  }

  function removeLadder() {
    if (!canRemove) return;
    onChange({
      names: value.names.slice(0, -1),
      outcomes: value.outcomes.slice(0, -1),
    });
  }

  function updateName(index: number, name: string) {
    onChange({
      ...value,
      names: value.names.map((item, itemIndex) => (itemIndex === index ? name : item)),
    });
  }

  function updateOutcome(index: number, outcome: string) {
    onChange({
      ...value,
      outcomes: value.outcomes.map((item, itemIndex) => (itemIndex === index ? outcome : item)),
    });
  }

  function fillDefaultOutcomes() {
    onChange({
      ...value,
      outcomes: value.names.map((_, index) => (index === 0 ? '벌칙' : '통과')),
    });
  }

  function shuffleEntries() {
    onChange({
      names: shuffleWith(value.names, Math.random),
      outcomes: shuffleWith(value.outcomes, Math.random),
    });
  }

  function startGame(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (canStart) onStart();
  }

  return (
    <form className="ladder-setup" onSubmit={startGame}>
      <header className="ladder-setup__intro">
        <h2>참가자와 결과 설정</h2>
        <p>같은 번호의 참가자와 결과가 하나의 사다리로 연결돼요.</p>
      </header>

      <div className="ladder-setup__count" role="group" aria-label="사다리 수 조절">
        <button type="button" disabled={!canRemove} onClick={removeLadder}>사다리 제거</button>
        <output className="ladder-setup__count-value" role="status" aria-label="현재 사다리 수">
          {value.names.length}개
        </output>
        <button type="button" onClick={addLadder}>사다리 추가</button>
      </div>

      <ol className="ladder-setup__list" aria-label="참가자와 결과">
        {value.names.map((name, index) => {
          const nameId = `${formId}-name-${index}`;
          const outcomeId = `${formId}-outcome-${index}`;

          return (
            <li className="ladder-setup-row" key={index}>
              <span className="ladder-setup-row__number" aria-hidden="true">
                {String(index + 1).padStart(2, '0')}
              </span>
              <label className="ladder-setup-row__field ladder-setup-row__field--name" htmlFor={nameId}>
                <span>참가자 {index + 1}</span>
                <input
                  id={nameId}
                  value={name}
                  placeholder="이름"
                  onChange={(event) => updateName(index, event.target.value)}
                />
              </label>
              <label className="ladder-setup-row__field ladder-setup-row__field--outcome" htmlFor={outcomeId}>
                <span>결과 {index + 1}</span>
                <input
                  id={outcomeId}
                  value={value.outcomes[index] ?? ''}
                  placeholder="벌칙 또는 선물"
                  onChange={(event) => updateOutcome(index, event.target.value)}
                />
              </label>
            </li>
          );
        })}
      </ol>

      <button className="ladder-setup__preset" type="button" onClick={fillDefaultOutcomes}>
        벌칙 1개와 통과로 채우기
      </button>
      <div className="ladder-setup__actions">
        <button type="button" onClick={shuffleEntries}>참가자와 결과 섞기</button>
        <button className="button--accent" type="submit" disabled={!canStart}>게임 시작</button>
      </div>
    </form>
  );
}
