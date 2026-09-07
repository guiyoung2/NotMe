// @ts-expect-error 앱 타입 범위에서 제외한 Node 내장 모듈을 테스트에서만 사용한다.
import { readFileSync } from 'node:fs';

import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { saveDraft } from '../../shared/draftStorage';
import { isLadderDraft, LadderPage, type LadderDraft } from './LadderPage';

const ladderStyles = readFileSync('src/features/ladder/ladder.css', 'utf8');

const playingDraft: LadderDraft = {
  phase: 'playing',
  names: ['짱구', '철수'],
  outcomes: ['통과', '벌칙'],
  ladder: { columnCount: 2, rows: [[0], [], [], [], [], []] },
  revealedStarts: [0],
};

type User = ReturnType<typeof userEvent.setup>;

function renderPage() {
  return render(<MemoryRouter initialEntries={['/ladder']}><LadderPage /></MemoryRouter>);
}

async function fillSetup(user: User) {
  await user.type(screen.getByLabelText('참가자 1'), '짱구');
  await user.type(screen.getByLabelText('참가자 2'), '철수');
  await user.type(screen.getByLabelText('결과 1'), '통과');
  await user.type(screen.getByLabelText('결과 2'), '벌칙');
}

function readStoredDraft(): LadderDraft | undefined {
  const rawDraft = localStorage.getItem('notme:draft:ladder');
  if (rawDraft === null) return undefined;
  return (JSON.parse(rawDraft) as { payload?: LadderDraft }).payload;
}

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.restoreAllMocks();
});

describe('isLadderDraft', () => {
  it('빈 입력을 포함한 setup draft를 허용한다', () => {
    expect(isLadderDraft({
      phase: 'setup',
      names: ['', ''],
      outcomes: ['', ''],
      ladder: null,
      revealedStarts: [],
    })).toBe(true);
  });

  it('유효한 playing draft를 허용한다', () => {
    expect(isLadderDraft(playingDraft)).toBe(true);
  });

  it.each([
    ['참가자가 두 명보다 적음', { ...playingDraft, names: ['짱구'], outcomes: ['통과'], ladder: { columnCount: 1, rows: [] } }],
    ['참가자와 결과 길이가 다름', { ...playingDraft, outcomes: ['통과'] }],
    ['playing 참가자가 비어 있음', { ...playingDraft, names: ['짱구', '   '] }],
    ['playing 결과가 비어 있음', { ...playingDraft, outcomes: ['통과', ''] }],
    ['setup에 사다리가 있음', { ...playingDraft, phase: 'setup', revealedStarts: [] }],
    ['setup에 공개 결과가 있음', { ...playingDraft, phase: 'setup', ladder: null }],
    ['playing에 사다리가 없음', { ...playingDraft, ladder: null }],
    ['사다리 열 수가 참가자 수와 다름', { ...playingDraft, ladder: { columnCount: 3, rows: [[], [], [], [], [], []] } }],
    ['사다리 열 수가 정수가 아님', { ...playingDraft, ladder: { columnCount: 2.5, rows: [[], [], [], [], [], []] } }],
    ['row가 비어 있음', { ...playingDraft, ladder: { columnCount: 2, rows: [] } }],
    ['row가 하나 부족함', { ...playingDraft, ladder: { columnCount: 2, rows: [[], [], [], [], []] } }],
    ['row가 하나 초과함', { ...playingDraft, ladder: { columnCount: 2, rows: [[], [], [], [], [], [], []] } }],
    ['row가 배열이 아님', { ...playingDraft, ladder: { columnCount: 2, rows: [0, [], [], [], [], []] } }],
    ['link가 정수가 아님', { ...playingDraft, ladder: { columnCount: 2, rows: [[0.5], [], [], [], [], []] } }],
    ['link가 열 범위를 벗어남', { ...playingDraft, ladder: { columnCount: 2, rows: [[1], [], [], [], [], []] } }],
    ['한 row의 link가 서로 인접함', { ...playingDraft, names: ['짱구', '철수', '유리'], outcomes: ['통과', '벌칙', '꽝'], ladder: { columnCount: 3, rows: [[0, 1], [], [], [], [], []] } }],
    ['공개 index가 중복됨', { ...playingDraft, revealedStarts: [0, 0] }],
    ['공개 index가 범위를 벗어남', { ...playingDraft, revealedStarts: [2] }],
    ['공개 index가 정수가 아님', { ...playingDraft, revealedStarts: [0.5] }],
    ['계획에 없는 최상위 필드가 있음', { ...playingDraft, activeStart: 0 }],
  ])('%s draft를 거부한다', (_description, draft) => {
    expect(isLadderDraft(draft)).toBe(false);
  });
});

describe('LadderPage', () => {
  it('참가자와 결과를 두 칸씩 둔 설정으로 시작한다', () => {
    renderPage();

    expect(screen.getByLabelText('참가자 1')).toHaveValue('');
    expect(screen.getByLabelText('참가자 2')).toHaveValue('');
    expect(screen.getByLabelText('결과 1')).toHaveValue('');
    expect(screen.getByLabelText('결과 2')).toHaveValue('');
  });

  it('설정 변경을 즉시 저장하고 새로고침 후 복구한다', async () => {
    const user = userEvent.setup();
    const firstRender = renderPage();

    await user.type(screen.getByLabelText('참가자 1'), '짱구');
    expect(readStoredDraft()).toEqual({
      phase: 'setup',
      names: ['짱구', ''],
      outcomes: ['', ''],
      ladder: null,
      revealedStarts: [],
    });

    firstRender.unmount();
    renderPage();
    expect(screen.getByLabelText('참가자 1')).toHaveValue('짱구');
  });

  it('공백을 제거한 설정으로 사다리를 한 번 생성하고 이후 판을 고정한다', async () => {
    const user = userEvent.setup();
    const random = vi.spyOn(Math, 'random').mockReturnValue(0.99);
    renderPage();

    await user.type(screen.getByLabelText('참가자 1'), '  짱구  ');
    await user.type(screen.getByLabelText('참가자 2'), '철수');
    await user.type(screen.getByLabelText('결과 1'), '  통과  ');
    await user.type(screen.getByLabelText('결과 2'), '벌칙');
    await user.click(screen.getByRole('button', { name: '게임 시작' }));

    expect(random).toHaveBeenCalledTimes(6);
    expect(readStoredDraft()?.names).toEqual(['짱구', '철수']);
    expect(readStoredDraft()?.outcomes).toEqual(['통과', '벌칙']);

    await user.click(screen.getByRole('button', { name: '짱구 경로 보기' }));
    await user.click(screen.getByRole('button', { name: '전체 결과 보기' }));
    expect(random).toHaveBeenCalledTimes(6);
  });

  it('개별 결과를 즉시 공개하고 전체 결과를 중복 없는 index로 저장한다', async () => {
    const user = userEvent.setup();
    vi.spyOn(Math, 'random').mockReturnValue(0.99);
    renderPage();
    await fillSetup(user);
    await user.click(screen.getByRole('button', { name: '게임 시작' }));

    expect(screen.queryByText('통과')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '짱구 경로 보기' }));
    expect(screen.getByText('통과')).toBeInTheDocument();
    expect(readStoredDraft()?.revealedStarts).toEqual([0]);

    await user.click(screen.getByRole('button', { name: '짱구 경로 보기' }));
    expect(readStoredDraft()?.revealedStarts).toEqual([0]);

    await user.click(screen.getByRole('button', { name: '전체 결과 보기' }));
    expect(screen.getByText('통과')).toBeInTheDocument();
    expect(screen.getByText('벌칙')).toBeInTheDocument();
    expect(readStoredDraft()?.revealedStarts).toEqual([0, 1]);
    expect(readStoredDraft()).not.toHaveProperty('activeStart');
  });

  it('저장된 판과 공개 결과는 복구하지만 활성 애니메이션은 복구하지 않는다', () => {
    saveDraft('ladder', playingDraft);

    const { container } = renderPage();

    expect(screen.getByText('벌칙')).toBeInTheDocument();
    expect(container.querySelector('.ladder-board__active-path')).not.toBeInTheDocument();
  });

  it('손상된 draft를 삭제하고 빈 설정으로 안전하게 복구한다', () => {
    saveDraft('ladder', {
      ...playingDraft,
      names: ['짱구', '철수', '유리'],
      outcomes: ['통과', '벌칙', '꽝'],
      ladder: { columnCount: 3, rows: [[0, 1], [], [], [], [], []] },
    });

    renderPage();

    expect(screen.getByLabelText('참가자 1')).toHaveValue('');
    expect(screen.getByLabelText('참가자 2')).toHaveValue('');
    expect(localStorage.getItem('notme:draft:ladder')).toBeNull();
  });

  it('activeStart가 저장된 draft를 삭제하고 다시 영속화하지 않는다', () => {
    saveDraft('ladder', { ...playingDraft, activeStart: 0 });

    renderPage();

    expect(screen.getByLabelText('참가자 1')).toHaveValue('');
    expect(localStorage.getItem('notme:draft:ladder')).toBeNull();
  });

  it('초기화를 확인하면 draft와 판을 삭제한다', async () => {
    const user = userEvent.setup();
    renderPage();
    await fillSetup(user);
    await user.click(screen.getByRole('button', { name: '게임 시작' }));

    await user.click(screen.getByRole('button', { name: '초기화' }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: '초기화' }));

    expect(localStorage.getItem('notme:draft:ladder')).toBeNull();
    expect(screen.getByLabelText('참가자 1')).toHaveValue('');
    expect(screen.getByLabelText('결과 2')).toHaveValue('');
  });

  it('홈 이동을 확인하면 draft와 판을 삭제한다', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.type(screen.getByLabelText('참가자 1'), ' ');

    await user.click(screen.getByRole('button', { name: '홈으로' }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: '종료' }));

    expect(localStorage.getItem('notme:draft:ladder')).toBeNull();
  });

  it('320px 화면에서 페이지는 줄이고 보드와 긴 값만 안전하게 가로 이동·줄바꿈한다', () => {
    expect(ladderStyles).toMatch(/\.ladder-page\s*{[^}]*width:\s*100%;[^}]*min-width:\s*0;/s);
    expect(ladderStyles).toMatch(/\.ladder-play\s*{[^}]*width:\s*100%;[^}]*min-width:\s*0;/s);
    expect(ladderStyles).toMatch(/\.ladder-board__scroll\s*{[^}]*overflow-x:\s*auto;/s);
    expect(ladderStyles).toMatch(/\.ladder-board__endpoint\s*{[^}]*overflow-wrap:\s*anywhere;/s);
    expect(ladderStyles).toMatch(/\.ladder-play__reveal-all\s*{[^}]*width:\s*100%;[^}]*margin-bottom:\s*max\(16px,\s*env\(safe-area-inset-bottom\)\);/s);
  });
});
