import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, useLocation } from 'react-router-dom';

import { saveDraft } from '../../shared/draftStorage';
import type { MarbleRace as MarbleRaceComponent } from './MarbleRace';
import type { MarbleGameConfig } from './MarbleSetup';
import type { RaceSnapshot } from './engine/RouletteEngine';

type RaceProps = Parameters<typeof MarbleRaceComponent>[0];
const raceSessions: RaceProps[] = [];

vi.mock('./MarbleRace', () => ({
  MarbleRace: (props: RaceProps) => {
    raceSessions.push(props);
    return (
      <section aria-label="가짜 마블 레이스">
        <button type="button" onClick={() => props.onFinish(createFinishedSnapshot(props.config))}>완주시키기</button>
        <button type="button" onClick={() => props.onAbort()}>중단시키기</button>
        <button type="button" onClick={() => props.onError(new Error('WASM 실패'))}>실패시키기</button>
      </section>
    );
  },
}));

import { isMarbleDraft, MarblePage, type MarbleDraft } from './MarblePage';

const config: MarbleGameConfig = {
  participants: [
    { id: 'a', name: '짱구', count: 2 },
    { id: 'b', name: '짱구', count: 1 },
  ],
  winnerMode: 'first',
  skillsEnabled: true,
  shuffledMarbles: [
    { id: 'a:1', participantId: 'a', name: '짱구' },
    { id: 'b:0', participantId: 'b', name: '짱구' },
    { id: 'a:0', participantId: 'a', name: '짱구' },
  ],
};

function createFinishedSnapshot(gameConfig: MarbleGameConfig): RaceSnapshot {
  const finishOrder = gameConfig.shuffledMarbles.map((marble, index) => ({ ...marble, rank: index + 1 }));
  return {
    active: [],
    dynamicObstacles: [],
    skillEffects: [],
    skillActivationCount: 0,
    finishOrder,
    winner: gameConfig.winnerMode === 'first' ? finishOrder[0] : finishOrder.at(-1) ?? null,
    winnerMode: gameConfig.winnerMode,
    speed: 1,
  };
}

function readDraft(): MarbleDraft | undefined {
  const raw = localStorage.getItem('notme:draft:marble');
  return raw ? (JSON.parse(raw) as { payload?: MarbleDraft }).payload : undefined;
}

function CurrentPath() {
  return <output aria-label="현재 경로">{useLocation().pathname}</output>;
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/marble']}>
      <MarblePage />
      <CurrentPath />
    </MemoryRouter>,
  );
}

async function startConfiguredRace(user: ReturnType<typeof userEvent.setup>, winnerMode: 'first' | 'last' = 'first') {
  saveDraft('marble', { phase: 'setup', config: { ...config, winnerMode } });
  renderPage();
  await user.click(screen.getByRole('button', { name: '레이스 시작' }));
}

beforeEach(() => {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
});

afterEach(() => {
  cleanup();
  localStorage.clear();
  raceSessions.length = 0;
  vi.restoreAllMocks();
});

describe('isMarbleDraft', () => {
  const validResult: MarbleDraft = {
    phase: 'result',
    config,
    finishOrder: createFinishedSnapshot(config).finishOrder,
  };

  it.each([
    ['배열 payload', []],
    ['draft 추가 키', { phase: 'setup', config, extra: true }],
    ['config 추가 키', { phase: 'setup', config: { ...config, extra: true } }],
    ['참가자 추가 키', { phase: 'setup', config: { ...config, participants: [{ ...config.participants[0], extra: true }, config.participants[1]] } }],
    ['참가자 한 명', { phase: 'setup', config: { ...config, participants: [config.participants[0]], shuffledMarbles: config.shuffledMarbles.slice(0, 2) } }],
    ['빈 참가자 ID', { phase: 'setup', config: { ...config, participants: [{ ...config.participants[0], id: '' }, config.participants[1]] } }],
    ['중복 참가자 ID', { phase: 'setup', config: { ...config, participants: [config.participants[0], { ...config.participants[1], id: 'a' }] } }],
    ['문자열이 아닌 이름', { phase: 'setup', config: { ...config, participants: [{ ...config.participants[0], name: 1 }, config.participants[1]] } }],
    ['범위 밖 개수', { phase: 'setup', config: { ...config, participants: [{ ...config.participants[0], count: 0 }, config.participants[1]] } }],
    ['100개 초과 합계', { phase: 'setup', config: { ...config, participants: [{ ...config.participants[0], count: 100 }, { ...config.participants[1], count: 1 }], shuffledMarbles: [] } }],
    ['잘못된 winner mode', { phase: 'setup', config: { ...config, winnerMode: 'middle' } }],
    ['boolean이 아닌 skills', { phase: 'setup', config: { ...config, skillsEnabled: 1 } }],
    ['누락된 구슬', { phase: 'setup', config: { ...config, shuffledMarbles: config.shuffledMarbles.slice(1) } }],
    ['중복 구슬', { phase: 'setup', config: { ...config, shuffledMarbles: [config.shuffledMarbles[0], config.shuffledMarbles[0], config.shuffledMarbles[2]] } }],
    ['잘못된 구슬 ID', { phase: 'setup', config: { ...config, shuffledMarbles: [{ ...config.shuffledMarbles[0], id: 'a:2' }, ...config.shuffledMarbles.slice(1)] } }],
    ['ID와 다른 참가자', { phase: 'setup', config: { ...config, shuffledMarbles: [{ ...config.shuffledMarbles[0], participantId: 'b' }, ...config.shuffledMarbles.slice(1)] } }],
    ['참가자와 다른 구슬 이름', { phase: 'setup', config: { ...config, shuffledMarbles: [{ ...config.shuffledMarbles[0], name: '철수' }, ...config.shuffledMarbles.slice(1)] } }],
    ['setup의 결과 필드', { phase: 'setup', config, finishOrder: [] }],
    ['racing의 공백 이름', { phase: 'racing', config: { ...config, participants: [{ ...config.participants[0], name: ' ' }, config.participants[1]], shuffledMarbles: [{ ...config.shuffledMarbles[0], name: '' }, config.shuffledMarbles[1], { ...config.shuffledMarbles[2], name: '' }] } }],
    ['result의 일부 순위', { ...validResult, finishOrder: validResult.finishOrder.slice(0, 2) }],
    ['result의 중복 seed', { ...validResult, finishOrder: [validResult.finishOrder[0], { ...validResult.finishOrder[0], rank: 2 }, validResult.finishOrder[2]] }],
    ['result의 끊긴 순위', { ...validResult, finishOrder: validResult.finishOrder.map((item, index) => ({ ...item, rank: index + 2 })) }],
    ['result의 추가 필드', { ...validResult, winner: validResult.finishOrder[0] }],
  ])('%s를 거부한다', (_label, value) => {
    expect(isMarbleDraft(value)).toBe(false);
  });

  it('setup에서는 공백 이름을 허용하고 racing/result에서는 완전한 config와 순위만 허용한다', () => {
    const blankConfig: MarbleGameConfig = {
      participants: [
        { id: 'a', name: ' ', count: 1 },
        { id: 'b', name: '', count: 1 },
      ],
      winnerMode: 'first',
      skillsEnabled: false,
      shuffledMarbles: [
        { id: 'a:0', participantId: 'a', name: '' },
        { id: 'b:0', participantId: 'b', name: '' },
      ],
    };

    expect(isMarbleDraft({ phase: 'setup', config: blankConfig })).toBe(true);
    expect(isMarbleDraft({ phase: 'racing', config })).toBe(true);
    expect(isMarbleDraft(validResult)).toBe(true);
  });
});

describe('MarblePage', () => {
  it.each(['완주 직후', 'draft 복구'] as const)('%s에도 맵 → 도착 명단 → 당첨 결과를 표시하고 같은 구슬 색상을 유지한다', async (phase) => {
    if (phase === '완주 직후') {
      const user = userEvent.setup();
      await startConfiguredRace(user);
      await user.click(screen.getByRole('button', { name: '완주시키기' }));
    } else {
      saveDraft('marble', { phase: 'result', config, finishOrder: createFinishedSnapshot(config).finishOrder });
      renderPage();
    }
    const map = screen.getByLabelText('마블 레이스 코스');
    const arrivals = screen.getByRole('list', { name: '도착 명단' });
    const winner = screen.getByRole('heading', { name: '짱구 님이 당첨됐어요' });
    expect(map.compareDocumentPosition(arrivals) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(arrivals.compareDocumentPosition(winner) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByLabelText('도착 진행')).toHaveTextContent('도착 3 / 3');
    expect(arrivals).toHaveTextContent('1위 짱구 2번 구슬');
    expect(document.body).not.toHaveTextContent(/a:0|a:1|b:0|_r_.*participant/);
    const ranking = screen.getByRole('list', { name: '전체 도착 순위' });
    const arrivalColors = Array.from(arrivals.querySelectorAll<HTMLElement>('.marble-color')).map((dot) => dot.style.backgroundColor);
    const resultColors = Array.from(ranking.querySelectorAll<HTMLElement>('.marble-color')).map((dot) => dot.style.backgroundColor);
    expect(new Set(arrivalColors).size).toBe(3);
    expect(resultColors).toEqual(arrivalColors);
    expect(screen.queryByRole('button', { name: '레이스 중단' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '다시 하기' })).toBeInTheDocument();
  });

  it('설정부터 완주해 첫 번째 당첨자와 당첨 구슬, 전체 순위를 표시한다', async () => {
    const user = userEvent.setup();
    await startConfiguredRace(user);

    expect(readDraft()).toEqual({ phase: 'racing', config });
    await user.click(screen.getByRole('button', { name: '완주시키기' }));

    expect(screen.getByRole('heading', { name: '짱구 님이 당첨됐어요' })).toBeInTheDocument();
    expect(screen.getByText('짱구 2번 구슬', { selector: '.marble-result__winner-marble' }))
      .toBeInTheDocument();
    const ranking = screen.getByRole('list', { name: '전체 도착 순위' });
    expect(within(ranking).getAllByRole('listitem')).toHaveLength(3);
    expect(within(ranking).getAllByText('짱구 1번 구슬')).toHaveLength(2);
    expect(readDraft()).toEqual({
      phase: 'result',
      config,
      finishOrder: createFinishedSnapshot(config).finishOrder,
    });
  });

  it('마지막 모드에서는 마지막 구슬과 참가자를 강조한다', async () => {
    const user = userEvent.setup();
    await startConfiguredRace(user, 'last');
    await user.click(screen.getByRole('button', { name: '완주시키기' }));

    expect(screen.getByText('짱구 1번 구슬', { selector: '.marble-result__winner-marble' }))
      .toBeInTheDocument();
  });

  it('다시 하기는 같은 설정으로 돌아가고 초기화는 빈 기본 설정과 삭제된 draft로 돌아간다', async () => {
    const user = userEvent.setup();
    await startConfiguredRace(user);
    await user.click(screen.getByRole('button', { name: '완주시키기' }));
    await user.click(screen.getByRole('button', { name: '다시 하기' }));

    expect(screen.getByLabelText('참가자 1 이름')).toHaveValue('짱구');
    expect(readDraft()).toEqual({ phase: 'setup', config });

    await user.click(screen.getByRole('button', { name: '초기화' }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: '초기화' }));
    expect(screen.getByLabelText('참가자 1 이름')).toHaveValue('');
    expect(screen.getByLabelText('참가자 2 이름')).toHaveValue('');
    expect(localStorage.getItem('notme:draft:marble')).toBeNull();
  });

  it('홈 이동을 확인하면 draft를 삭제하고 홈으로 이동한다', async () => {
    const user = userEvent.setup();
    await startConfiguredRace(user);
    await user.click(screen.getByRole('button', { name: '홈으로' }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: '종료' }));

    expect(localStorage.getItem('notme:draft:marble')).toBeNull();
    expect(screen.getByLabelText('현재 경로')).toHaveTextContent('/');
  });

  it('시작 전 입력과 옵션, 섞인 순서를 저장하고 복구한다', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.type(screen.getByLabelText('참가자 1 이름'), '짱구');
    await user.click(screen.getByRole('radio', { name: '마지막' }));
    await user.click(screen.getByRole('switch', { name: '스킬 사용' }));
    const stored = readDraft();

    cleanup();
    renderPage();
    expect(screen.getByLabelText('참가자 1 이름')).toHaveValue('짱구');
    expect(screen.getByRole('radio', { name: '마지막' })).toBeChecked();
    expect(screen.getByRole('switch', { name: '스킬 사용' })).toBeChecked();
    expect(readDraft()?.config.shuffledMarbles).toEqual(stored?.config.shuffledMarbles);
  });

  it('racing draft는 같은 설정으로 정규화하고 중단 안내를 한 번만 표시한다', () => {
    saveDraft('marble', { phase: 'racing', config });
    renderPage();

    expect(screen.getByText('진행 중이던 레이스는 다시 시작해 주세요')).toBeInTheDocument();
    expect(screen.getByLabelText('참가자 1 이름')).toHaveValue('짱구');
    expect(readDraft()).toEqual({ phase: 'setup', config });

    cleanup();
    renderPage();
    expect(screen.queryByText('진행 중이던 레이스는 다시 시작해 주세요')).not.toBeInTheDocument();
  });

  it('result draft에서 당첨 구슬과 전체 순위를 복구한다', () => {
    saveDraft('marble', {
      phase: 'result',
      config,
      finishOrder: createFinishedSnapshot(config).finishOrder,
    });
    renderPage();

    expect(screen.getByRole('heading', { name: '짱구 님이 당첨됐어요' })).toBeInTheDocument();
    expect(within(screen.getByRole('list', { name: '전체 도착 순위' })).getAllByRole('listitem')).toHaveLength(3);
  });

  it('손상된 draft를 삭제하고 빈 설정으로 복구한다', () => {
    saveDraft('marble', { phase: 'result', config, finishOrder: [] });
    renderPage();

    expect(screen.getByLabelText('참가자 1 이름')).toHaveValue('');
    expect(localStorage.getItem('notme:draft:marble')).toBeNull();
  });

  it('오류 화면은 Canvas 없이 다시 시도와 안전한 홈 이동을 제공한다', async () => {
    const user = userEvent.setup();
    await startConfiguredRace(user);
    await user.click(screen.getByRole('button', { name: '실패시키기' }));

    expect(screen.getByRole('heading', { name: '룰렛을 불러오지 못했어요' })).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(document.querySelector('canvas')).toBeNull();

    await user.click(screen.getByRole('button', { name: '다시 시도' }));
    expect(screen.getByRole('region', { name: '가짜 마블 레이스' })).toBeInTheDocument();
    expect(raceSessions).toHaveLength(2);
    expect(readDraft()).toEqual({ phase: 'racing', config });

    await user.click(screen.getByRole('button', { name: '실패시키기' }));
    await user.click(screen.getByRole('button', { name: '홈으로 돌아가기' }));
    expect(localStorage.getItem('notme:draft:marble')).toBeNull();
    expect(screen.getByLabelText('현재 경로')).toHaveTextContent('/');
  });

  it('중단 뒤 이전 레이스의 늦은 완료와 오류 callback을 무시한다', async () => {
    const user = userEvent.setup();
    await startConfiguredRace(user);
    const staleSession = raceSessions[0];
    await user.click(screen.getByRole('button', { name: '중단시키기' }));

    expect(screen.getByLabelText('참가자 1 이름')).toHaveValue('짱구');
    staleSession?.onFinish(createFinishedSnapshot(config));
    staleSession?.onError(new Error('늦은 오류'));

    expect(screen.getByLabelText('참가자 1 이름')).toBeInTheDocument();
    expect(screen.queryByText('룰렛을 불러오지 못했어요')).not.toBeInTheDocument();
    expect(readDraft()).toEqual({ phase: 'setup', config });
  });

  it('오류 및 초기화 후에도 이전 레이스 callback이 현재 화면을 바꾸지 못한다', async () => {
    const user = userEvent.setup();
    await startConfiguredRace(user);
    const failedSession = raceSessions[0];
    await user.click(screen.getByRole('button', { name: '실패시키기' }));

    failedSession?.onFinish(createFinishedSnapshot(config));
    expect(screen.getByRole('heading', { name: '룰렛을 불러오지 못했어요' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '다시 시도' }));
    const resetSession = raceSessions.at(-1);
    failedSession?.onError(new Error('늦은 오류'));
    expect(screen.getByRole('region', { name: '가짜 마블 레이스' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '초기화' }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: '초기화' }));
    resetSession?.onFinish(createFinishedSnapshot(config));
    resetSession?.onError(new Error('늦은 오류'));

    expect(screen.getByLabelText('참가자 1 이름')).toHaveValue('');
    expect(screen.queryByText('룰렛을 불러오지 못했어요')).not.toBeInTheDocument();
    expect(localStorage.getItem('notme:draft:marble')).toBeNull();
  });
});
