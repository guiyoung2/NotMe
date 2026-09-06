// @ts-expect-error 앱 타입 범위에서 제외한 Node 내장 모듈을 테스트에서만 사용한다.
import { readFileSync } from 'node:fs';

import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { LadderBoard } from './LadderBoard';

const ladderStyles = readFileSync('src/features/ladder/ladder.css', 'utf8');

const ladder = {
  columnCount: 3,
  rows: [[0], [1], []],
};

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('LadderBoard', () => {
  it('참가자를 누르면 선택한 시작 index를 전달한다', async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    render(
      <LadderBoard
        ladder={ladder}
        names={['짱구', '철수', '유리']}
        outcomes={['통과', '벌칙', '꽝']}
        revealedStarts={[]}
        activeStart={null}
        onSelect={onSelect}
      />,
    );

    await user.click(screen.getByRole('button', { name: '짱구 경로 보기' }));

    expect(onSelect).toHaveBeenCalledWith(0);
  });

  it('활성 시작점의 고정 trace를 별도 polyline으로 그린다', () => {
    const { container } = render(
      <LadderBoard
        ladder={ladder}
        names={['짱구', '철수', '유리']}
        outcomes={['통과', '벌칙', '꽝']}
        revealedStarts={[0]}
        activeStart={0}
        onSelect={() => {}}
      />,
    );

    const path = container.querySelector('.ladder-board__active-path');
    expect(path).toHaveAttribute('points', '0,0 0,44 72,44 72,88 144,88 144,132');
    expect(path).toHaveAttribute('pathLength', '1');
  });

  it('공개된 시작점이 도착한 결과만 텍스트로 보여 준다', () => {
    render(
      <LadderBoard
        ladder={ladder}
        names={['짱구', '철수', '유리']}
        outcomes={['통과', '벌칙', '꽝']}
        revealedStarts={[0]}
        activeStart={0}
        onSelect={() => {}}
      />,
    );

    expect(screen.getByText('꽝')).toBeInTheDocument();
    expect(screen.queryByText('통과')).not.toBeInTheDocument();
    expect(screen.queryByText('벌칙')).not.toBeInTheDocument();
  });

  it('72×44 격자로 SVG 크기를 계산하고 접근 가능한 설명을 제공한다', () => {
    render(
      <LadderBoard
        ladder={ladder}
        names={['짱구', '철수', '유리']}
        outcomes={['통과', '벌칙', '꽝']}
        revealedStarts={[]}
        activeStart={null}
        onSelect={() => {}}
      />,
    );

    const svg = screen.getByRole('img', { name: '사다리 경로' });
    expect(svg).toHaveAttribute('viewBox', '-36 -22 216 176');
    expect(svg).toHaveStyle({ minWidth: '216px' });
    expect(svg).toHaveAccessibleDescription('3명의 참가자를 3개의 결과와 연결하는 사다리입니다.');
  });

  it('보드만 가로로 이동하고 모션 감소 시 경로를 즉시 표시한다', () => {
    expect(ladderStyles).toMatch(/\.ladder-board\s*{[^}]*width:\s*100%;[^}]*min-width:\s*0;/s);
    expect(ladderStyles).toMatch(/\.ladder-board__scroll\s*{[^}]*overflow-x:\s*auto;/s);
    expect(ladderStyles).toMatch(/\.ladder-board__endpoint\s*{[^}]*min-height:\s*44px;[^}]*overflow-wrap:\s*anywhere;/s);
    expect(ladderStyles).toMatch(/\.ladder-board__active-path\s*{[^}]*stroke-dasharray:\s*1;[^}]*stroke-dashoffset:\s*1;[^}]*animation:/s);
    expect(ladderStyles).toMatch(/@media\s*\(prefers-reduced-motion:\s*reduce\)\s*{[\s\S]*?\.ladder-board__active-path\s*{[^}]*animation:\s*none;[^}]*stroke-dashoffset:\s*0;/);
  });
});
