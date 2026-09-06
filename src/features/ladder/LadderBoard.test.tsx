// @ts-expect-error 앱 타입 범위에서 제외한 Node 내장 모듈을 테스트에서만 사용한다.
import { readFileSync } from 'node:fs';

import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { LadderBoard } from './LadderBoard';

const appStyles = readFileSync('src/app/styles.css', 'utf8');
const ladderStyles = readFileSync('src/features/ladder/ladder.css', 'utf8');

const ladder = {
  columnCount: 3,
  rows: [[0], [1], []],
};

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getDeclaration(styles: string, selector: string, property: string): string | null {
  const rule = styles.match(new RegExp(`${escapeRegExp(selector)}\\s*{([^}]*)}`));
  if (!rule) return null;
  const declaration = rule[1].match(new RegExp(`(?:^|;)\\s*${escapeRegExp(property)}\\s*:\\s*([^;]+)`));
  return declaration?.[1].trim() ?? null;
}

function resolveColor(value: string, styles: string): string | null {
  const variable = value.match(/^var\((--[\w-]+)\)$/)?.[1];
  if (!variable) return /^#[\da-f]{6}$/i.test(value) ? value : null;
  return styles.match(new RegExp(`${escapeRegExp(variable)}\\s*:\\s*(#[\\da-f]{6})`, 'i'))?.[1] ?? null;
}

function relativeLuminance(color: string): number {
  const channels = color.match(/[\da-f]{2}/gi)?.map((channel) => Number.parseInt(channel, 16) / 255);
  if (!channels || channels.length !== 3) throw new Error(`유효하지 않은 RGB 색상: ${color}`);
  const [red, green, blue] = channels.map((channel) => (
    channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
  ));
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function contrastRatio(first: string, second: string): number {
  const luminances = [relativeLuminance(first), relativeLuminance(second)].sort((a, b) => b - a);
  return (luminances[0] + 0.05) / (luminances[1] + 0.05);
}

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

  it('기본 사다리 선은 실제 보드 배경과 3:1 이상 대비를 유지한다', () => {
    const allStyles = `${appStyles}\n${ladderStyles}`;
    const boardBackgroundValue = getDeclaration(ladderStyles, '.ladder-board', 'background')
      ?? getDeclaration(appStyles, 'body', 'background')
      ?? '';
    const lineValue = getDeclaration(ladderStyles, '.ladder-board__lines line', 'stroke') ?? '';
    const boardBackground = resolveColor(boardBackgroundValue, allStyles);
    const lineColor = resolveColor(lineValue, allStyles);

    expect(boardBackground).not.toBeNull();
    expect(lineColor).not.toBeNull();
    if (!boardBackground || !lineColor) return;

    expect(contrastRatio(lineColor, boardBackground)).toBeGreaterThanOrEqual(3);
  });
});
