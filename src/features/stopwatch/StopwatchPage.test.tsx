import { act, cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

import { StopwatchPage } from './StopwatchPage';

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

    await user.click(screen.getByRole('button', { name: '초기화' }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: '초기화' }));

    expect(screen.getByLabelText('참가자 1')).toHaveValue('');
    expect(screen.getByLabelText('참가자 2')).toHaveValue('');
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

    expect(screen.getByRole('heading', { name: '짱구 님이 선택됐어요' })).toBeInTheDocument();
    const scoreList = screen.getByRole('list', { name: '전체 점수' });
    expect(within(scoreList).getByText('짱구 1 × 2 = 2')).toBeInTheDocument();
    expect(within(scoreList).getByText('철수 3 × 4 = 12')).toBeInTheDocument();
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
    expect(screen.getByText('짱구, 철수')).toBeInTheDocument();
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
