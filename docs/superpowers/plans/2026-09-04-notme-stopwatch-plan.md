# NotMe 스톱워치 게임 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 참가자별 두 측정값의 1/100초 마지막 숫자를 곱해 최저 점수 참가자와 동점 재대결을 판정하는 게임을 만든다.

**Architecture:** 순수 도메인 함수와 reducer가 규칙과 진행 상태를 소유하고 React 화면은 현재 상태를 표시하고 이벤트만 전달한다. 시간 측정은 `performance.now()`를 사용하며 저장 가능한 상태에는 실행 중 기준 시각을 넣지 않는다.

**Tech Stack:** React, TypeScript, Vitest, Testing Library, `performance.now()`

**Spec:** `docs/superpowers/specs/2026-09-04-notme-mvp-design.md`

## Global Constraints

- 참가자는 게임 안에서 매 판 입력하며 최소 두 명이다.
- 각 참가자는 두 번 측정하고 1/100초 마지막 숫자의 곱을 점수로 얻는다.
- 최저 점수 동점자는 한 명이 남을 때까지 동점자끼리 재대결한다.
- 백그라운드 이동 중인 측정은 무효화한다.
- 초기화와 홈 이동은 스톱워치 판과 복구 데이터를 삭제한다.

---

## File Structure

- `src/features/stopwatch/stopwatchRules.ts` — 숫자 추출, 점수, 최저 점수 참가자
- `src/features/stopwatch/stopwatchRules.test.ts` — 규칙 단위 테스트
- `src/features/stopwatch/stopwatchMachine.ts` — 설정·측정·결과·재대결 reducer
- `src/features/stopwatch/stopwatchMachine.test.ts` — 상태 전이 테스트
- `src/features/stopwatch/StopwatchPage.tsx` — 참가자 설정과 상태별 화면 조합
- `src/features/stopwatch/StopwatchPage.test.tsx` — 사용자 흐름과 백그라운드 테스트
- `src/features/stopwatch/stopwatch.css` — 큰 타이머와 모바일 배치

### Task 1: 점수와 동점 규칙

**Files:**
- Create: `src/features/stopwatch/stopwatchRules.ts`
- Create: `src/features/stopwatch/stopwatchRules.test.ts`

**Interfaces:**
- Produces: `lastHundredthDigit(elapsedMs: number): number`; `multiplyDigits(attempts: readonly [number, number]): number`; `lowestPlayerIds(players: readonly ScoredPlayer[]): string[]`; `ScoredPlayer`

- [ ] **Step 1: 실패하는 규칙 테스트를 작성한다**

```ts
describe('lastHundredthDigit', () => {
  it.each([[0, 0], [47, 4], [1299, 9], [12345, 4]])('%dms의 마지막 숫자는 %d다', (ms, digit) => {
    expect(lastHundredthDigit(ms)).toBe(digit);
  });
});

it('최저 점수 동점자만 반환한다', () => {
  expect(lowestPlayerIds([
    { id: 'a', score: 12 }, { id: 'b', score: 4 }, { id: 'c', score: 4 },
  ])).toEqual(['b', 'c']);
});
```

Run: `npm test -- src/features/stopwatch/stopwatchRules.test.ts`
Expected: FAIL because rule functions do not exist.

- [ ] **Step 2: 최소 규칙 함수를 구현한다**

```ts
export const lastHundredthDigit = (elapsedMs: number) => Math.floor(Math.max(0, elapsedMs) / 10) % 10;
export const multiplyDigits = ([first, second]: readonly [number, number]) => first * second;

export function lowestPlayerIds(players: readonly ScoredPlayer[]) {
  const minimum = Math.min(...players.map(({ score }) => score));
  return players.filter(({ score }) => score === minimum).map(({ id }) => id);
}
```

- [ ] **Step 3: 규칙 테스트를 실행한다**

Run: `npm test -- src/features/stopwatch/stopwatchRules.test.ts`
Expected: PASS.

- [ ] **Step 4: 커밋한다**

```bash
git add src/features/stopwatch
git commit -m "스톱워치 점수와 동점 규칙 추가"
```

### Task 2: 스톱워치 상태 머신

**Files:**
- Create: `src/features/stopwatch/stopwatchMachine.ts`
- Create: `src/features/stopwatch/stopwatchMachine.test.ts`

**Interfaces:**
- Consumes: `lastHundredthDigit`, `multiplyDigits`, `lowestPlayerIds`
- Produces: `StopwatchState`; `StopwatchAction`; `createStopwatchGame(names: string[]): StopwatchState`; `stopwatchReducer(state, action): StopwatchState`; `isStopwatchDraft(value): value is StopwatchState`

- [ ] **Step 1: 참가자 순서와 두 측정 상태 전이 테스트를 작성한다**

```ts
it('두 번 측정하면 다음 참가자로 이동한다', () => {
  let state = createStopwatchGame(['짱구', '철수']);
  state = stopwatchReducer(state, { type: 'start', now: 1000 });
  state = stopwatchReducer(state, { type: 'stop', now: 1047 });
  state = stopwatchReducer(state, { type: 'start', now: 2000 });
  state = stopwatchReducer(state, { type: 'stop', now: 2099 });
  expect(state.players[0].attempts).toEqual([4, 9]);
  expect(state.currentPlayerIndex).toBe(1);
});
```

동점 시 `roundPlayerIds`가 동점자 ID만 포함하고 attempts가 비워지는 테스트, `invalidate-running-attempt`가 시작 시각만 제거하는 테스트도 작성한다.

Run: `npm test -- src/features/stopwatch/stopwatchMachine.test.ts`
Expected: FAIL because machine does not exist.

- [ ] **Step 2: 판별 가능한 상태를 구현한다**

```ts
export type StopwatchPhase = 'playing' | 'result';
export type PlayerRun = { id: string; name: string; attempts: number[]; score: number | null };
export type StopwatchState = {
  phase: StopwatchPhase;
  players: PlayerRun[];
  roundPlayerIds: string[];
  currentPlayerIndex: number;
  startedAt: number | null;
  round: number;
};
```

`stop`은 `now - startedAt`을 숫자로 변환한다. 두 번째 숫자 뒤 점수를 저장하고 다음 참가자로 이동한다. 라운드가 끝나면 전체 players가 아니라 현재 `roundPlayerIds`에 포함된 점수만 `lowestPlayerIds`에 전달한다. 최저 점수 ID가 하나면 `result`, 여러 개면 해당 ID의 attempts와 score만 비우고 그 ID들로 `roundPlayerIds`를 교체한 뒤 `round`를 증가시킨다.

- [ ] **Step 3: 상태 머신 테스트를 실행한다**

Run: `npm test -- src/features/stopwatch/stopwatchMachine.test.ts`
Expected: PASS.

- [ ] **Step 4: 커밋한다**

```bash
git add src/features/stopwatch
git commit -m "스톱워치 진행 상태 머신 구현"
```

### Task 3: 설정·플레이·결과 화면

**Files:**
- Create: `src/features/stopwatch/StopwatchPage.tsx`
- Create: `src/features/stopwatch/StopwatchPage.test.tsx`
- Create: `src/features/stopwatch/stopwatch.css`
- Modify: `src/app/App.tsx`

**Interfaces:**
- Consumes: `GameShell`; `stopwatchReducer`; `saveDraft`, `loadDraft`, `clearDraft`
- Produces: `StopwatchPage()` mounted at `/stopwatch`

- [ ] **Step 1: 전체 흐름 실패 테스트를 작성한다**

```tsx
it('참가자 두 명을 추가하고 첫 측정을 시작한다', async () => {
  const user = userEvent.setup();
  render(<MemoryRouter><StopwatchPage /></MemoryRouter>);
  await user.type(screen.getByLabelText('참가자 1'), '짱구');
  await user.type(screen.getByLabelText('참가자 2'), '철수');
  await user.click(screen.getByRole('button', { name: '게임 시작' }));
  expect(screen.getByRole('heading', { name: '짱구 차례예요' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: '시작' })).toBeInTheDocument();
});
```

Run: `npm test -- src/features/stopwatch/StopwatchPage.test.tsx`
Expected: FAIL because page does not exist.

- [ ] **Step 2: 설정과 플레이 UI를 구현한다**

설정 화면은 두 입력을 기본 제공하고 `참가자 추가`, 각 행의 삭제, `게임 시작`을 제공한다. 플레이 화면은 현재 참가자, `첫 번째/두 번째 측정`, `MM:SS.hh`, 시작·멈추기 버튼, 저장된 두 숫자와 곱을 표시한다. 실행 중 표시는 `requestAnimationFrame`으로 갱신하되 stop action에는 직접 읽은 `performance.now()`를 전달한다.

- [ ] **Step 3: 결과와 재대결 안내를 구현한다**

재대결 라운드에서는 `최저 점수 동점 — 동점자만 다시 측정합니다`와 이름을 표시한다. 결과 화면에는 선택된 사람과 모든 참가자의 숫자·곱을 표시한다. `다시 하기`는 `clearDraft('stopwatch')` 후 설정 화면으로 돌아간다.

- [ ] **Step 4: 화면 테스트를 실행한다**

Run: `npm test -- src/features/stopwatch && npm run typecheck`
Expected: PASS.

- [ ] **Step 5: 커밋한다**

```bash
git add src/app/App.tsx src/features/stopwatch
git commit -m "스톱워치 게임 화면 완성"
```

### Task 4: 복구와 백그라운드 무효화

**Files:**
- Modify: `src/features/stopwatch/StopwatchPage.tsx`
- Modify: `src/features/stopwatch/StopwatchPage.test.tsx`

**Interfaces:**
- Consumes: `document.visibilityState`; `invalidate-running-attempt`; draft storage
- Produces: 새로고침 복구와 백그라운드 측정 취소

- [ ] **Step 1: 백그라운드와 복구 테스트를 추가한다**

실행 중 `visibilitychange`를 발생시키면 `측정이 취소됐어요. 다시 시작해 주세요.`가 나타나고 버튼이 `시작`으로 돌아오는지 테스트한다. 저장된 유효 draft로 렌더링하면 현재 참가자와 완료된 숫자를 복구하는지도 테스트한다.

Run: `npm test -- src/features/stopwatch/StopwatchPage.test.tsx`
Expected: FAIL because visibility and restore are not connected.

- [ ] **Step 2: visibility와 저장을 연결한다**

`visibilitychange`에서 `document.visibilityState === 'hidden'`이고 `startedAt !== null`이면 무효화 action을 보낸다. reducer 상태가 변할 때 실행 중 기준 시각을 `null`로 바꾼 직렬화 상태만 저장한다. `GameShell.onReset`과 홈 이동 확인에는 `clearDraft('stopwatch')`를 연결한다.

- [ ] **Step 3: 전체 스톱워치 검사를 실행한다**

Run: `npm test -- src/features/stopwatch src/shared src/app && npm run typecheck && npm run build`
Expected: PASS.

- [ ] **Step 4: 커밋한다**

```bash
git add src/features/stopwatch
git commit -m "스톱워치 복구와 백그라운드 처리 추가"
```
