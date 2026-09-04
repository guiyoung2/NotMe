# NotMe 사다리 타기 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 참가자와 같은 수의 자유 결과를 입력하고 고정된 무작위 사다리 경로를 개별 또는 전체 공개하는 게임을 만든다.

**Architecture:** 사다리는 행별 인접 연결 목록으로 표현하고 순수 함수가 생성과 경로 추적을 담당한다. React 화면은 설정과 SVG 표현을 분리하고 애니메이션은 이미 계산된 경로만 따라간다.

**Tech Stack:** React, TypeScript, SVG, Vitest, Testing Library

**Spec:** `docs/superpowers/specs/2026-09-04-notme-mvp-design.md`

## Global Constraints

- 사다리 수는 최소 2이며 참가자와 결과의 수가 같다.
- 기본 결과는 벌칙 한 칸과 나머지 통과이며 모든 결과를 직접 바꿀 수 있다.
- 선택적 섞기는 참가자와 결과 순서를 각각 바꾼다.
- 시작 시 구조와 결과를 고정하고 애니메이션 중 다시 계산하지 않는다.
- 화면보다 넓은 사다리는 사다리 영역만 가로로 이동한다.

---

## File Structure

- `src/features/ladder/ladderRules.ts` — 사다리 생성, 경로 추적, 섞기
- `src/features/ladder/ladderRules.test.ts` — 일대일 매핑과 생성 제약 테스트
- `src/features/ladder/LadderSetup.tsx` — 수·이름·결과 입력
- `src/features/ladder/LadderBoard.tsx` — SVG 선과 공개 경로
- `src/features/ladder/LadderPage.tsx` — 설정·진행·결과 상태와 복구
- `src/features/ladder/LadderPage.test.tsx` — 사용자 흐름 테스트
- `src/features/ladder/ladder.css` — 가로 이동과 경로 애니메이션

### Task 1: 사다리 생성과 경로 추적

**Files:**
- Create: `src/features/ladder/ladderRules.ts`
- Create: `src/features/ladder/ladderRules.test.ts`

**Interfaces:**
- Produces: `RandomSource = () => number`; `LadderRow = number[]`; `Ladder`; `generateLadder(columnCount, random): Ladder`; `traceLadder(ladder, start): LadderTrace`; `shuffleWith<T>(values, random): T[]`

- [ ] **Step 1: 생성 제약과 전단사 테스트를 작성한다**

```ts
it('한 행에 인접하거나 겹치는 가로선을 만들지 않는다', () => {
  const ladder = generateLadder(6, () => 0.2);
  for (const row of ladder.rows) {
    expect(row.every((left, index) => index === 0 || left - row[index - 1] > 1)).toBe(true);
  }
});

it('모든 시작점은 서로 다른 도착점에 연결된다', () => {
  const ladder = generateLadder(8, seededRandom(17));
  const ends = Array.from({ length: 8 }, (_, start) => traceLadder(ladder, start).end);
  expect(new Set(ends).size).toBe(8);
});
```

테스트 안에 결정적인 `seededRandom(seed)` 헬퍼를 정의한다.

Run: `npm test -- src/features/ladder/ladderRules.test.ts`
Expected: FAIL because rules do not exist.

- [ ] **Step 2: 최소 생성 알고리즘을 구현한다**

```ts
export type Ladder = { columnCount: number; rows: LadderRow[] };

export function generateLadder(columnCount: number, random: RandomSource): Ladder {
  const rowCount = Math.max(6, columnCount * 2);
  const rows = Array.from({ length: rowCount }, () => {
    const links: number[] = [];
    for (let left = 0; left < columnCount - 1; left += 1) {
      if (links.at(-1) !== left - 1 && random() < 0.38) links.push(left);
    }
    return links;
  });
  return { columnCount, rows };
}
```

`traceLadder`는 각 행에서 현재 열이 `left`면 오른쪽, `left + 1`이면 왼쪽으로 이동하고 SVG가 사용할 `{ row, column }[]` 지점을 함께 반환한다. `shuffleWith`는 전달받은 배열을 복사한 뒤 Fisher–Yates 방식으로 섞는다.

- [ ] **Step 3: 규칙 테스트를 실행한다**

Run: `npm test -- src/features/ladder/ladderRules.test.ts`
Expected: PASS.

- [ ] **Step 4: 커밋한다**

```bash
git add src/features/ladder
git commit -m "사다리 생성과 경로 추적 규칙 추가"
```

### Task 2: 사다리 설정 화면

**Files:**
- Create: `src/features/ladder/LadderSetup.tsx`
- Create: `src/features/ladder/LadderSetup.test.tsx`

**Interfaces:**
- Consumes: `shuffleWith`
- Produces: `LadderSetupValue = { names: string[]; outcomes: string[] }`; `LadderSetup({ value, onChange, onStart })`

- [ ] **Step 1: 수 변경과 기본 결과 테스트를 작성한다**

```tsx
it('네 칸을 선택하면 벌칙 하나와 통과 세 개를 채운다', async () => {
  const user = userEvent.setup();
  render(<LadderSetup value={{ names: ['', ''], outcomes: ['', ''] }} onChange={onChange} onStart={() => {}} />);
  await user.click(screen.getByRole('button', { name: '사다리 추가' }));
  await user.click(screen.getByRole('button', { name: '사다리 추가' }));
  await user.click(screen.getByRole('button', { name: '벌칙 1개와 통과로 채우기' }));
  expect(lastValue.outcomes).toEqual(['벌칙', '통과', '통과', '통과']);
});
```

Run: `npm test -- src/features/ladder/LadderSetup.test.tsx`
Expected: FAIL because setup component does not exist.

- [ ] **Step 2: 동적 입력 UI를 구현한다**

사다리 추가·제거 시 names와 outcomes를 동시에 한 칸씩 늘리거나 줄인다. 입력 label은 `참가자 1`, `결과 1`처럼 고유하게 연결한다. 시작은 모든 trim 결과가 비어 있지 않고 길이가 같을 때만 활성화한다. 섞기는 names와 outcomes에 별도의 `shuffleWith` 호출을 적용한다.

- [ ] **Step 3: 설정 테스트를 실행한다**

Run: `npm test -- src/features/ladder/LadderSetup.test.tsx`
Expected: PASS.

- [ ] **Step 4: 커밋한다**

```bash
git add src/features/ladder
git commit -m "사다리 참가자와 결과 설정 화면 추가"
```

### Task 3: SVG 사다리와 고정 경로 공개

**Files:**
- Create: `src/features/ladder/LadderBoard.tsx`
- Create: `src/features/ladder/LadderBoard.test.tsx`
- Create: `src/features/ladder/ladder.css`

**Interfaces:**
- Consumes: `Ladder`, `traceLadder`
- Produces: `LadderBoard({ ladder, names, outcomes, revealedStarts, activeStart, onSelect })`

- [ ] **Step 1: 선택 경로와 결과 공개 테스트를 작성한다**

```tsx
it('참가자를 누르면 고정 경로의 결과를 공개한다', async () => {
  const ladder = { columnCount: 2, rows: [[0], []] };
  const user = userEvent.setup();
  render(<LadderBoard ladder={ladder} names={['짱구', '철수']} outcomes={['통과', '벌칙']} revealedStarts={[]} activeStart={null} onSelect={onSelect} />);
  await user.click(screen.getByRole('button', { name: '짱구 경로 보기' }));
  expect(onSelect).toHaveBeenCalledWith(0);
});
```

Run: `npm test -- src/features/ladder/LadderBoard.test.tsx`
Expected: FAIL because board does not exist.

- [ ] **Step 2: SVG 보드를 구현한다**

열 간격 72, 행 간격 44로 viewBox 너비와 높이를 계산한다. 세로선과 행별 가로선을 먼저 그리고 활성 경로는 별도 polyline으로 그린다. `revealedStarts`의 결과만 텍스트를 표시한다. 컨테이너는 `overflow-x: auto`, SVG는 계산된 최소 너비를 가진다.

- [ ] **Step 3: 모션 감소와 애니메이션을 구현한다**

활성 polyline은 `stroke-dasharray`와 `stroke-dashoffset`으로 표현하고 `prefers-reduced-motion: reduce`에서는 전환 없이 즉시 표시한다. 애니메이션 종료가 결과 계산을 호출하지 않도록 결과는 부모가 미리 `traceLadder`로 구한다.

- [ ] **Step 4: 보드 테스트를 실행한다**

Run: `npm test -- src/features/ladder/LadderBoard.test.tsx && npm run typecheck`
Expected: PASS.

- [ ] **Step 5: 커밋한다**

```bash
git add src/features/ladder
git commit -m "사다리 경로 공개 보드 구현"
```

### Task 4: 사다리 페이지 상태와 복구

**Files:**
- Create: `src/features/ladder/LadderPage.tsx`
- Create: `src/features/ladder/LadderPage.test.tsx`
- Modify: `src/app/App.tsx`

**Interfaces:**
- Consumes: `GameShell`, `LadderSetup`, `LadderBoard`, draft storage
- Produces: `LadderPage()` mounted at `/ladder`

- [ ] **Step 1: 설정부터 전체 공개까지 실패 테스트를 작성한다**

두 참가자와 결과를 입력하고 시작한 뒤 한 참가자를 공개하고 `전체 결과 보기`를 누르면 결과 두 개가 모두 표시되는 흐름을 테스트한다. 초기화 시 `notme:draft:ladder`가 제거되는 테스트도 포함한다.

Run: `npm test -- src/features/ladder/LadderPage.test.tsx`
Expected: FAIL because page does not exist.

- [ ] **Step 2: 페이지 상태를 구현한다**

```ts
type LadderDraft = {
  phase: 'setup' | 'playing';
  names: string[];
  outcomes: string[];
  ladder: Ladder | null;
  revealedStarts: number[];
};
```

시작 시 `generateLadder(names.length, Math.random)`을 한 번만 호출한다. 개별 공개는 중복 없이 start index를 추가하고 전체 공개는 `0..names.length-1`을 저장한다. 모든 상태 변경을 draft에 저장하고 유효성 판별 함수로만 복구한다.

- [ ] **Step 3: 라우팅과 스타일을 연결한다**

`/ladder` placeholder를 `LadderPage`로 교체한다. 설정 화면은 세로 입력, 진행 화면은 가로 이동 가능한 보드를 사용하고 하단 전체 공개 버튼은 안전 영역 위에 둔다.

- [ ] **Step 4: 전체 사다리 검사를 실행한다**

Run: `npm test -- src/features/ladder src/shared src/app && npm run typecheck && npm run build`
Expected: PASS.

- [ ] **Step 5: 커밋한다**

```bash
git add src/app/App.tsx src/features/ladder
git commit -m "사다리 타기 게임 완성"
```
