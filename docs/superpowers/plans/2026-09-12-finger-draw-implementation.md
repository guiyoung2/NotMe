# Finger Draw Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** NotMe에 최대 10명이 동시에 손가락을 올려 한 명을 뽑는 3초 카운트다운 게임을 추가한다.

**Architecture:** `fingerDrawMachine.ts`는 포인터 목록과 대기·카운트다운·결과 전이를 순수하게 관리한다. `FingerDrawPage.tsx`는 Pointer Events와 타이머를 상태 머신에 연결하고, 기존 `GameShell`·홈·라우팅에 새 게임을 통합한다.

**Tech Stack:** React 19, TypeScript, React Router, Vitest, Testing Library, Playwright, CSS

**Spec:** `docs/superpowers/specs/2026-09-12-finger-draw-design.md`

## Global Constraints

- 동시에 인식된 손가락이 2개 이상일 때만 3초 카운트다운을 시작한다.
- 최대 10개까지만 참가자로 등록하고 11번째 접촉은 카운트다운을 재시작하지 않는다.
- 카운트다운 중 참가자의 추가·제거는 3초부터 다시 시작하고, 위치 이동은 재시작하지 않는다.
- 원에는 번호·이름·인원 수를 표시하지 않는다.
- 결과 화면에는 `다시 하기` 버튼만 두며 우측 상단 `초기화` 버튼은 표시하지 않는다.
- 새 게임은 `draftStorage`에 저장하지 않고 기존 게임 동작을 변경하지 않는다.

---

### Task 1: 손가락 추첨 상태 머신

**Files:**
- Create: `src/features/finger/fingerDrawMachine.test.ts`
- Create: `src/features/finger/fingerDrawMachine.ts`

**Interfaces:**
- Produces: `createFingerDrawGame(): FingerDrawState`, `fingerDrawReducer(state, action): FingerDrawState`, `pickFingerId(ids, random): number`, `COUNTDOWN_MS`
- Produces: `FingerDrawState` with `phase`, `fingers`, `countdownStartedAt`, `countdownVersion`, `countdownReason`, `selectedId`

- [ ] **Step 1: Write failing reducer tests**

```ts
import { createFingerDrawGame, fingerDrawReducer } from './fingerDrawMachine';

it('두 번째 손가락에서 3초 카운트다운을 시작한다', () => {
  const first = fingerDrawReducer(createFingerDrawGame(), { type: 'touch-start', id: 1, x: 10, y: 20, now: 100 });
  const state = fingerDrawReducer(first, { type: 'touch-start', id: 2, x: 30, y: 40, now: 200 });

  expect(state).toMatchObject({ phase: 'countdown', countdownStartedAt: 200, countdownReason: 'initial' });
  expect(state.fingers).toHaveLength(2);
});

it('카운트다운 중 참가자 제거는 새 3초 카운트다운으로 바꾼다', () => {
  let state = createFingerDrawGame();
  for (const id of [1, 2, 3]) state = fingerDrawReducer(state, { type: 'touch-start', id, x: id, y: id, now: id * 100 });
  state = fingerDrawReducer(state, { type: 'touch-end', id: 3, now: 900 });

  expect(state).toMatchObject({ phase: 'countdown', countdownStartedAt: 900, countdownReason: 'changed' });
  expect(state.fingers.map(({ id }) => id)).toEqual([1, 2]);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- src/features/finger/fingerDrawMachine.test.ts`

Expected: FAIL because `fingerDrawMachine.ts` does not exist.

- [ ] **Step 3: Implement the minimal state machine**

```ts
export const COUNTDOWN_MS = 3_000;
export type FingerDrawPhase = 'waiting' | 'countdown' | 'result';
export type FingerDrawAction =
  | { type: 'touch-start'; id: number; x: number; y: number; now: number }
  | { type: 'touch-move'; id: number; x: number; y: number }
  | { type: 'touch-end'; id: number; now: number }
  | { type: 'resolve'; version: number; selectedId: number }
  | { type: 'reset' };
```

Keep a fixed palette of 10 colors. Start or restart a countdown only when the active finger set changes and contains at least two IDs. Validate `resolve` by version and current active ID. Ignore touch mutations in `result` and all new touches after the tenth finger.

- [ ] **Step 4: Extend the test with movement, ten-finger limit, stale completion, result, and reset behavior**

```ts
it('열 번째 뒤의 손가락은 등록하거나 카운트다운을 바꾸지 않는다', () => {
  let state = createFingerDrawGame();
  for (let id = 1; id <= 10; id += 1) state = fingerDrawReducer(state, { type: 'touch-start', id, x: id, y: id, now: id });
  const unchanged = fingerDrawReducer(state, { type: 'touch-start', id: 11, x: 11, y: 11, now: 99 });

  expect(unchanged).toBe(state);
});
```

- [ ] **Step 5: Run the state-machine tests to verify they pass**

Run: `npm test -- src/features/finger/fingerDrawMachine.test.ts`

Expected: PASS with reducer behavior covering all state transitions.

- [ ] **Step 6: Commit the state machine**

```bash
git add src/features/finger/fingerDrawMachine.ts src/features/finger/fingerDrawMachine.test.ts
git commit -m "feat: 손가락 추첨 상태 머신 추가"
```

### Task 2: 터치 화면과 카운트다운 표시

**Files:**
- Create: `src/features/finger/FingerDrawPage.test.tsx`
- Create: `src/features/finger/FingerDrawPage.tsx`
- Create: `src/features/finger/fingerDraw.css`

**Interfaces:**
- Consumes: `COUNTDOWN_MS`, `createFingerDrawGame`, `fingerDrawReducer`, `FingerDrawState`
- Produces: `FingerDrawPage` React route component

- [ ] **Step 1: Write failing page tests**

```tsx
it('두 번째 포인터에서 카운트다운 안내를 표시한다', () => {
  render(<MemoryRouter><FingerDrawPage /></MemoryRouter>);
  const field = screen.getByTestId('finger-touch-field');
  fireEvent.pointerDown(field, { pointerId: 1, clientX: 40, clientY: 80 });
  fireEvent.pointerDown(field, { pointerId: 2, clientX: 120, clientY: 180 });

  expect(screen.getByText('그대로 유지하세요')).toBeInTheDocument();
  expect(screen.getByText('3')).toBeInTheDocument();
});

it('3초 뒤 선택 결과와 다시 하기 버튼을 표시한다', () => {
  vi.useFakeTimers();
  render(<MemoryRouter><FingerDrawPage /></MemoryRouter>);
  const field = screen.getByTestId('finger-touch-field');
  fireEvent.pointerDown(field, { pointerId: 1, clientX: 40, clientY: 80 });
  fireEvent.pointerDown(field, { pointerId: 2, clientX: 120, clientY: 180 });
  act(() => vi.advanceTimersByTime(3_000));

  expect(screen.getByText('선택됐어요!')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: '다시 하기' })).toBeInTheDocument();
});
```

- [ ] **Step 2: Run the page test to verify it fails**

Run: `npm test -- src/features/finger/FingerDrawPage.test.tsx`

Expected: FAIL because `FingerDrawPage.tsx` does not exist.

- [ ] **Step 3: Implement Pointer Events and timer lifecycle**

Render `GameShell` with `showReset={false}` and `dirty={false}`. Use `useReducer`, a 3-second timeout keyed by `countdownVersion`, and a short display interval for 3·2·1. Convert `clientX/clientY` to percentage positions inside the touch field. Call `setPointerCapture` when available; handle `pointerup`, `pointercancel`, and `lostpointercapture` as removals. Clear an active countdown when the state changes, and reset only active countdowns on `visibilitychange` to hidden.

- [ ] **Step 4: Add focused visual styles**

Use a minimum-height touch field with `touch-action: none`, `user-select: none`, and `overscroll-behavior: contain`. Render color-only circles; animate their scale only during countdown and disable the animation for `prefers-reduced-motion`. Make the initial message one line down to a 320px viewport and leave a normal bottom button in the result state.

- [ ] **Step 5: Extend the page tests and run them to verify green**

Add cases for changed-participant copy, reset via `다시 하기`, hidden reset control, and ignoring post-result pointer events. Run: `npm test -- src/features/finger/FingerDrawPage.test.tsx`

Expected: PASS with all page interactions green.

- [ ] **Step 6: Commit the page**

```bash
git add src/features/finger/FingerDrawPage.tsx src/features/finger/FingerDrawPage.test.tsx src/features/finger/fingerDraw.css src/app/GameShell.tsx src/app/GameShell.test.tsx src/app/styles.css
git commit -m "feat: 손가락 추첨 화면 추가"
```

### Task 3: 앱 통합과 문서

**Files:**
- Modify: `src/app/App.tsx`
- Modify: `src/app/HomePage.tsx`
- Modify: `src/app/App.test.tsx`
- Modify: `README.md`

**Interfaces:**
- Consumes: `FingerDrawPage`
- Produces: `/finger` route and 홈 게임 선택 링크

- [ ] **Step 1: Write failing integration tests**

```tsx
it('손가락 추첨 링크가 /finger 경로를 가리킨다', () => {
  render(<App />);
  expect(screen.getByRole('link', { name: /손가락 추첨/ })).toHaveAttribute('href', '/finger');
});

it('/finger 직접 경로에서 손가락 추첨을 렌더링한다', () => {
  window.history.replaceState({}, '', '/finger');
  render(<App />);
  expect(screen.getByTestId('finger-touch-field')).toBeInTheDocument();
});
```

- [ ] **Step 2: Run the integration tests to verify they fail**

Run: `npm test -- src/app/App.test.tsx`

Expected: FAIL because the route and home link do not exist.

- [ ] **Step 3: Add route, home entry, and README description**

Register `/finger`, add `손가락 추첨` with the description `손가락으로 한 명 뽑기`, and add a README game rule that explains 2~10 touches, the 3-second restart-on-change rule, and the result reset button.

- [ ] **Step 4: Run integration tests to verify green**

Run: `npm test -- src/app/App.test.tsx`

Expected: PASS with new home and direct route behavior.

- [ ] **Step 5: Commit integration changes**

```bash
git add src/app/App.tsx src/app/HomePage.tsx src/app/App.test.tsx README.md
git commit -m "feat: 손가락 추첨 게임 연결"
```

### Task 4: 브라우저 회귀 검증

**Files:**
- Create: `e2e/finger.spec.ts`
- Modify: `e2e/navigation.spec.ts`

**Interfaces:**
- Consumes: deployed Vite app route `/finger` and `[data-testid="finger-touch-field"]`
- Produces: Chromium-level navigation and game-flow coverage

- [ ] **Step 1: Write a failing E2E test**

```ts
test('손가락 추첨은 두 포인터 뒤 3초에 결과를 표시하고 다시 시작한다', async ({ page }) => {
  await page.goto('/finger');
  const field = page.getByTestId('finger-touch-field');
  await field.dispatchEvent('pointerdown', { pointerId: 1, clientX: 60, clientY: 100 });
  await field.dispatchEvent('pointerdown', { pointerId: 2, clientX: 180, clientY: 200 });
  await expect(page.getByText('그대로 유지하세요')).toBeVisible();
  await expect(page.getByText('선택됐어요!')).toBeVisible({ timeout: 4_000 });
  await page.getByRole('button', { name: '다시 하기' }).click();
  await expect(page.getByText('화면에 손가락을 올려주세요')).toBeVisible();
});
```

- [ ] **Step 2: Build E2E output and run the new test to verify it fails before integration**

Run: `npm run build:e2e && npm run test:e2e -- e2e/finger.spec.ts --workers=1`

Expected: FAIL before the route is implemented; PASS after Tasks 1-3.

- [ ] **Step 3: Add the home-to-finger navigation assertion and run the E2E test**

Run: `npm run test:e2e -- e2e/finger.spec.ts e2e/navigation.spec.ts --workers=1`

Expected: PASS with direct route, result, replay, and home navigation coverage.

- [ ] **Step 4: Run final verification**

Run: `npm run verify`

Expected: PASS for TypeScript, unit tests, build, production check, and Chromium E2E. If the pre-existing marble integration test still reports 99 instead of 100 completions, report it separately without changing marble behavior as part of this feature.

- [ ] **Step 5: Commit E2E coverage and plan updates**

```bash
git add e2e/finger.spec.ts e2e/navigation.spec.ts docs/superpowers/plans/2026-09-12-finger-draw-implementation.md
git commit -m "test: 손가락 추첨 브라우저 흐름 추가"
```
