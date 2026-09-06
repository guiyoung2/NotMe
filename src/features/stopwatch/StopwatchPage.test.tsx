import { act, cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

import { saveDraft } from '../../shared/draftStorage';
import { StopwatchPage } from './StopwatchPage';
import type { StopwatchState } from './stopwatchMachine';

type User = ReturnType<typeof userEvent.setup>;

async function startTwoPlayerGame(user: User) {
  await user.type(screen.getByLabelText('참가자 1'), '짱구');
  await user.type(screen.getByLabelText('참가자 2'), '철수');
  await user.click(screen.getByRole('button', { name: '게임 시작' }));
}

async function saveDigit(user: User, clock: { now: number }, digit: number) {
  await user.click(screen.getByRole('button', { name: '시작' }));
  clock.now += digit * 10;
  await user.click(screen.getByRole('button', { name: '멈추기' }));
}

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.restoreAllMocks();
});

describe('StopwatchPage', () => {
  it('참가자 두 명을 추가하고 첫 측정을 시작한다', async () => {
    const user = userEvent.setup();
    render(<MemoryRouter><StopwatchPage /></MemoryRouter>);

    await user.type(screen.getByLabelText('참가자 1'), '짱구');
    await user.type(screen.getByLabelText('참가자 2'), '철수');
    await user.click(screen.getByRole('button', { name: '게임 시작' }));

    expect(screen.getByRole('heading', { name: '짱구 차례예요' })).toBeInTheDocument();
    expect(screen.getByText('첫 번째 측정')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '시작' })).toBeInTheDocument();
  });

  it('참가자 행을 추가하고 삭제한다', async () => {
    const user = userEvent.setup();
    render(<MemoryRouter><StopwatchPage /></MemoryRouter>);

    await user.click(screen.getByRole('button', { name: '참가자 추가' }));
    expect(screen.getAllByRole('textbox')).toHaveLength(3);

    await user.click(screen.getByRole('button', { name: '참가자 2 삭제' }));
    expect(screen.getAllByRole('textbox')).toHaveLength(2);
  });

  it('참가자 이름이 두 개 이상 채워지면 공백을 제거해 시작한다', async () => {
    const user = userEvent.setup();
    render(<MemoryRouter><StopwatchPage /></MemoryRouter>);
    const startButton = screen.getByRole('button', { name: '게임 시작' });
    expect(startButton).toBeDisabled();

    await user.type(screen.getByLabelText('참가자 1'), '  짱구  ');
    expect(startButton).toBeDisabled();
    await user.type(screen.getByLabelText('참가자 2'), '철수');
    expect(startButton).toBeEnabled();

    await user.click(startButton);
    expect(screen.getByRole('heading', { name: '짱구 차례예요' })).toBeInTheDocument();
  });

  it('공백 없는 긴 이름에 컨테이너 내 줄바꿈 계약을 적용한다', async () => {
    const user = userEvent.setup();
    const longName = '가'.repeat(80);
    render(<MemoryRouter><StopwatchPage /></MemoryRouter>);

    await user.type(screen.getByLabelText('참가자 1'), longName);
    await user.type(screen.getByLabelText('참가자 2'), '철수');
    await user.click(screen.getByRole('button', { name: '게임 시작' }));

    const heading = screen.getByRole('heading', { name: `${longName} 차례예요` });
    expect(heading).toHaveClass('stopwatch-name-wrap');
  });

  it('이름을 입력하면 홈 이동 전에 종료 확인을 한다', async () => {
    const user = userEvent.setup();
    render(<MemoryRouter initialEntries={['/stopwatch']}><StopwatchPage /></MemoryRouter>);

    await user.type(screen.getByLabelText('참가자 1'), '짱구');
    await user.click(screen.getByRole('button', { name: '홈으로' }));

    expect(screen.getByRole('dialog', { name: '현재 게임을 종료할까요?' })).toBeInTheDocument();
  });

  it('공백만 입력해도 편집 중인 설정으로 본다', async () => {
    const user = userEvent.setup();
    render(<MemoryRouter initialEntries={['/stopwatch']}><StopwatchPage /></MemoryRouter>);

    await user.type(screen.getByLabelText('참가자 1'), ' ');
    await user.click(screen.getByRole('button', { name: '홈으로' }));

    expect(screen.getByRole('dialog', { name: '현재 게임을 종료할까요?' })).toBeInTheDocument();
  });

  it('진행 중 초기화하면 빈 설정 화면으로 돌아간다', async () => {
    const user = userEvent.setup();
    render(<MemoryRouter><StopwatchPage /></MemoryRouter>);
    await user.type(screen.getByLabelText('참가자 1'), '짱구');
    await user.type(screen.getByLabelText('참가자 2'), '철수');
    await user.click(screen.getByRole('button', { name: '게임 시작' }));
    expect(localStorage.getItem('notme:draft:stopwatch')).not.toBeNull();

    await user.click(screen.getByRole('button', { name: '초기화' }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: '초기화' }));

    expect(localStorage.getItem('notme:draft:stopwatch')).toBeNull();
    expect(screen.getByLabelText('참가자 1')).toHaveValue('');
    expect(screen.getByLabelText('참가자 2')).toHaveValue('');
  });

  it('홈 이동을 확인하면 스톱워치 draft를 삭제한다', async () => {
    const user = userEvent.setup();
    render(<MemoryRouter initialEntries={['/stopwatch']}><StopwatchPage /></MemoryRouter>);
    await startTwoPlayerGame(user);
    expect(localStorage.getItem('notme:draft:stopwatch')).not.toBeNull();

    await user.click(screen.getByRole('button', { name: '홈으로' }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: '종료' }));

    expect(localStorage.getItem('notme:draft:stopwatch')).toBeNull();
  });

  it('유효한 draft에서 현재 참가자와 완료된 측정을 복구한다', () => {
    const draft: StopwatchState = {
      phase: 'playing',
      players: [
        { id: 'player-0', name: '짱구', attempts: [2, 3], score: 6 },
        { id: 'player-1', name: '철수', attempts: [7], score: null },
      ],
      roundPlayerIds: ['player-0', 'player-1'],
      currentPlayerIndex: 1,
      startedAt: null,
      round: 1,
    };
    saveDraft('stopwatch', draft);

    render(<MemoryRouter><StopwatchPage /></MemoryRouter>);

    expect(screen.getByRole('heading', { name: '철수 차례예요' })).toBeInTheDocument();
    expect(screen.getByLabelText('첫 번째 저장 숫자')).toHaveTextContent('7');
    expect(screen.getByText('두 번째 측정')).toBeInTheDocument();
  });

  it('초기 draft는 첫 렌더에서 한 번만 불러온다', async () => {
    const user = userEvent.setup();
    const draft: StopwatchState = {
      phase: 'playing',
      players: [
        { id: 'player-0', name: '짱구', attempts: [], score: null },
        { id: 'player-1', name: '철수', attempts: [], score: null },
      ],
      roundPlayerIds: ['player-0', 'player-1'],
      currentPlayerIndex: 0,
      startedAt: null,
      round: 1,
    };
    saveDraft('stopwatch', draft);
    const getItem = vi.spyOn(Storage.prototype, 'getItem');

    render(<MemoryRouter><StopwatchPage /></MemoryRouter>);
    await user.click(screen.getByRole('button', { name: '시작' }));

    expect(getItem).toHaveBeenCalledTimes(1);
  });

  it('손상된 draft를 삭제하고 빈 설정 화면을 보여 준다', () => {
    saveDraft('stopwatch', { phase: 'playing', players: [] });

    render(<MemoryRouter><StopwatchPage /></MemoryRouter>);

    expect(screen.getByLabelText('참가자 1')).toHaveValue('');
    expect(screen.getByLabelText('참가자 2')).toHaveValue('');
    expect(localStorage.getItem('notme:draft:stopwatch')).toBeNull();
  });

  it('실행 중 상태를 저장할 때 startedAt을 null로 직렬화한다', async () => {
    const user = userEvent.setup();
    vi.spyOn(performance, 'now').mockReturnValue(1234);
    vi.spyOn(window, 'requestAnimationFrame').mockReturnValue(1);
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
    render(<MemoryRouter><StopwatchPage /></MemoryRouter>);
    await startTwoPlayerGame(user);

    await user.click(screen.getByRole('button', { name: '시작' }));

    const rawDraft = localStorage.getItem('notme:draft:stopwatch');
    expect(rawDraft).not.toBeNull();
    const storedDraft = JSON.parse(rawDraft ?? '{}') as { payload?: StopwatchState };
    expect(storedDraft.payload?.startedAt).toBeNull();
  });

  it('측정 중 화면이 숨겨지면 측정을 취소하고 다시 시작하도록 안내한다', async () => {
    const user = userEvent.setup();
    vi.spyOn(performance, 'now').mockReturnValue(1000);
    vi.spyOn(window, 'requestAnimationFrame').mockReturnValue(1);
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
    const visibilityState = vi.spyOn(document, 'visibilityState', 'get');
    visibilityState.mockReturnValue('visible');
    render(<MemoryRouter><StopwatchPage /></MemoryRouter>);
    await startTwoPlayerGame(user);
    await user.click(screen.getByRole('button', { name: '시작' }));

    visibilityState.mockReturnValue('hidden');
    act(() => document.dispatchEvent(new Event('visibilitychange')));

    expect(screen.getByText('측정이 취소됐어요. 다시 시작해 주세요.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '시작' })).toBeInTheDocument();
  });

  it('프레임으로 표시를 갱신하고 멈출 시각은 performance.now로 다시 읽는다', async () => {
    const user = userEvent.setup();
    let now = 1000;
    let frameCallback: FrameRequestCallback | undefined;
    vi.spyOn(performance, 'now').mockImplementation(() => now);
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      frameCallback = callback;
      return 1;
    });
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
    render(<MemoryRouter><StopwatchPage /></MemoryRouter>);
    await user.type(screen.getByLabelText('참가자 1'), '짱구');
    await user.type(screen.getByLabelText('참가자 2'), '철수');
    await user.click(screen.getByRole('button', { name: '게임 시작' }));

    await user.click(screen.getByRole('button', { name: '시작' }));
    now = 1234;
    act(() => frameCallback?.(0));
    expect(screen.getByText('00:00.23')).toBeInTheDocument();

    now = 1299;
    await user.click(screen.getByRole('button', { name: '멈추기' }));
    expect(screen.getByLabelText('첫 번째 저장 숫자')).toHaveTextContent('9');
    expect(screen.getByText('두 번째 측정')).toBeInTheDocument();
  });

  it('최저 점수 선택자와 전체 참가자 점수를 보여 준다', async () => {
    const user = userEvent.setup();
    const clock = { now: 1000 };
    vi.spyOn(performance, 'now').mockImplementation(() => clock.now);
    vi.spyOn(window, 'requestAnimationFrame').mockReturnValue(1);
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
    render(<MemoryRouter><StopwatchPage /></MemoryRouter>);
    await startTwoPlayerGame(user);

    await saveDigit(user, clock, 1);
    await saveDigit(user, clock, 2);
    await saveDigit(user, clock, 3);
    await saveDigit(user, clock, 4);

    expect(screen.getByRole('heading', { name: '짱구 님이 선택됐어요' })).toHaveClass('stopwatch-name-wrap');
    const scoreList = screen.getByRole('list', { name: '전체 점수' });
    expect(within(scoreList).getByText('짱구 1 × 2 = 2')).toHaveClass('stopwatch-name-wrap');
    expect(within(scoreList).getByText('철수 3 × 4 = 12')).toHaveClass('stopwatch-name-wrap');
  });

  it('재대결 라운드에서 동점자만 안내한다', async () => {
    const user = userEvent.setup();
    const clock = { now: 1000 };
    vi.spyOn(performance, 'now').mockImplementation(() => clock.now);
    vi.spyOn(window, 'requestAnimationFrame').mockReturnValue(1);
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
    render(<MemoryRouter><StopwatchPage /></MemoryRouter>);
    await startTwoPlayerGame(user);

    await saveDigit(user, clock, 1);
    await saveDigit(user, clock, 2);
    await saveDigit(user, clock, 1);
    await saveDigit(user, clock, 2);

    expect(screen.getByText('최저 점수 동점 — 동점자만 다시 측정합니다')).toBeInTheDocument();
    expect(screen.getByText('짱구, 철수')).toHaveClass('stopwatch-name-wrap');
    expect(screen.getByText('2라운드')).toBeInTheDocument();
  });

  it('다시 하기는 스톱워치 draft를 지우고 설정으로 돌아간다', async () => {
    const user = userEvent.setup();
    const clock = { now: 1000 };
    vi.spyOn(performance, 'now').mockImplementation(() => clock.now);
    vi.spyOn(window, 'requestAnimationFrame').mockReturnValue(1);
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
    render(<MemoryRouter><StopwatchPage /></MemoryRouter>);
    await startTwoPlayerGame(user);
    await saveDigit(user, clock, 1);
    await saveDigit(user, clock, 2);
    await saveDigit(user, clock, 3);
    await saveDigit(user, clock, 4);
    localStorage.setItem('notme:draft:stopwatch', 'saved');

    await user.click(screen.getByRole('button', { name: '다시 하기' }));

    expect(localStorage.getItem('notme:draft:stopwatch')).toBeNull();
    expect(screen.getByLabelText('참가자 1')).toHaveValue('');
  });
});
