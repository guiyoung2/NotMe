# 지그재그 마블 코스 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 외곽 프레임 안에 실제 지그재그 이동 통로와 상호작용하는 회전봉·반시계 결승 게이트를 구현한다.

**Architecture:** 코스 데이터(`NOTME_COURSE`)에 기존 `line`, `box`, `spinner` 장애물만 재배치한다. 물리 엔진·렌더러·UI API는 바꾸지 않고, `course.test.ts`는 좌표와 통로 관계를, 통합 테스트는 고정 시드 100구슬 완주를 검증한다.

**Tech Stack:** TypeScript, Vitest, Box2D WASM, Vite

**Spec:** `docs/superpowers/specs/2026-09-11-marble-zigzag-corridor-design.md`

## Global Constraints

- 코스 크기 `26×135`, viewport 높이 `24`, 골인 센서 및 UI 흐름은 바꾸지 않는다.
- 새 장애물 타입·물리 엔진 API·제품용 충돌 계측 API를 추가하지 않는다.
- 외곽 x=`0`, x=`26` 안전 프레임은 y=`0`부터 y=`135`까지 유지한다.
- 상단 2개 회전봉은 램프 출구 회전 반경 안에 둔다.
- 중앙 5개 회전봉은 center x=`3, 8, 13, 18, 23`, y=`68`, length=`5.5`로 서로 겹친다.
- 결승 게이트는 center=`(11.75,126)`, length=`3`, angularVelocity=`-1.2`를 사용한다.
- 구조 테스트 RED/GREEN 각 1회, 고정 시드 100구슬 통합 테스트 1회, 전체 단위 테스트 1회, build 1회만 실행한다.

---

### Task 1: 지그재그 코스 구조 회귀 테스트

**Files:**
- Modify: `src/features/marble/engine/course.test.ts`
- Modify: `src/features/marble/engine/course.ts`

**Interfaces:**
- Consumes: `NOTME_COURSE.sections`, `CourseObstacle`
- Produces: 연속 내부 벽, 상단 회전봉, 중앙 행, 결승 게이트의 좌표 계약

- [ ] **Step 1: 실패하는 구조 테스트 작성**

`course.test.ts`에 내부 벽의 시작·중앙 통로 선분, 상단 회전봉, 결승 게이트의 새 좌표를 기대하는 테스트를 추가한다.

```ts
expect(internalWalls).toEqual(expect.arrayContaining([
  { kind: 'line', from: { x: 0, y: 0 }, to: { x: 4, y: 12 } },
  { kind: 'line', from: { x: 26, y: 0 }, to: { x: 22, y: 13 } },
  { kind: 'line', from: { x: 3, y: 62 }, to: { x: 3, y: 76 } },
  { kind: 'line', from: { x: 23, y: 62 }, to: { x: 23, y: 76 } },
]));
```

그리고 다음 회전봉 기대값을 같은 테스트에 둔다.

```ts
expect(upperSpinners).toMatchObject([
  { id: 'spinner:upper-left', center: { x: 19.5, y: 19.5 }, length: 7, angularVelocity: 2.2 },
  { id: 'spinner:upper-right', center: { x: 7.5, y: 32 }, length: 7.5, angularVelocity: -1.8 },
]);
expect(gate).toMatchObject({
  center: { x: 11.75, y: 126 }, length: 3, angle: 0, angularVelocity: -1.2,
});
```

- [ ] **Step 2: 구조 테스트가 의도한 좌표 불일치로 실패하는지 확인**

Run: `npm test -- src/features/marble/engine/course.test.ts`

Expected: FAIL; 기존 상단 회전봉과 결승 게이트 좌표가 새 기대값과 다르다는 assertion failure.

- [ ] **Step 3: 코스 데이터를 최소 변경으로 구현**

`course.ts`에서 다음 점 배열의 인접 쌍을 기존 `line` 장애물로 추가한다.

```ts
const internalLeft = [
  { x: 0, y: 0 }, { x: 4, y: 12 }, { x: 2, y: 24 }, { x: 5.5, y: 32 },
  { x: 2.5, y: 43 }, { x: 2.5, y: 57 }, { x: 3, y: 62 }, { x: 3, y: 76 },
  { x: 1.5, y: 86 }, { x: 4.5, y: 96 }, { x: 2, y: 106 }, { x: 0, y: 108 },
];
const internalRight = [
  { x: 26, y: 0 }, { x: 22, y: 13 }, { x: 24, y: 25 }, { x: 20.5, y: 34 },
  { x: 24, y: 45 }, { x: 23.5, y: 57 }, { x: 23, y: 62 }, { x: 23, y: 76 },
  { x: 24.5, y: 87 }, { x: 21.5, y: 97 }, { x: 24, y: 107 }, { x: 26, y: 108 },
];
```

범퍼를 내부 벽 안으로 옮기고, 램프는 `(4,12)→(17.1,17.1)`, `(24,25)→(10,30)`으로 바꾼다. 상단 회전봉과 결승 회전봉은 spec 좌표로 옮긴다.

- [ ] **Step 4: 구조 테스트 통과 확인**

Run: `npm test -- src/features/marble/engine/course.test.ts`

Expected: PASS.

- [ ] **Step 5: 구조 변경 커밋**

`git add src/features/marble/engine/course.ts src/features/marble/engine/course.test.ts` 후 `git commit -m "마블 코스 지그재그 통로 적용"`을 실행한다.

### Task 2: 대표 레이스 완주 회귀 검증

**Files:**
- Modify: `src/features/marble/engine/RouletteEngine.integration.test.ts` (실패 시 진단에 필요한 최소 계측만 추가)
- Modify: `src/features/marble/engine/course.ts` (실패 시 spec 범위 안의 좌표만 보정)

**Interfaces:**
- Consumes: `NOTME_COURSE`, `Box2dPhysics`, `RouletteEngine`
- Produces: 고정 시드 1의 100구슬이 120초 안에 골인한다는 회귀 보장

- [ ] **Step 1: 기존 100구슬 통합 테스트를 새 코스에서 실행**

Run: `npm test -- src/features/marble/engine/RouletteEngine.integration.test.ts`

Expected: PASS. 실패할 경우에만 실패 구간을 한 번 기록한다.

- [ ] **Step 2: 필요한 경우만 최소 좌표 보정**

영구 정체·코스 이탈·120초 초과가 나온 경우에만 `course.ts`의 box 또는 짧은 line 좌표를 조정한다. 회전봉 ID, 외벽, 골인 센서, UI, 물리 엔진은 변경하지 않는다.

- [ ] **Step 3: 고정 시드 100구슬 통합 테스트를 한 번 재실행**

Run: `npm test -- src/features/marble/engine/RouletteEngine.integration.test.ts`

Expected: PASS; 100개 골인, 코스 이탈 없음, 시뮬레이션 시간 120,000ms 이하.

- [ ] **Step 4: 최종 검증**

Run: `npm test && npm run build`

Expected: PASS; 단위 테스트와 production build가 모두 성공.

- [ ] **Step 5: 검증 변경이 있을 때만 커밋**

`git add src/features/marble/engine/course.ts src/features/marble/engine/RouletteEngine.integration.test.ts` 후 `git commit -m "마블 코스 완주 검증 보완"`을 실행한다.

## Self-review

- spec의 연속 내부 벽, 상단 충돌 구간, 중앙 행 측면 차단, 하단 혼합, 반시계 결승 게이트는 Task 1에서 구현한다.
- 100구슬 완주·이탈·정체 검증은 Task 2에서 기존 통합 테스트로 수행한다.
- UI, 물리 API, 다중 맵, 추가 스킬은 전부 제외한다.
- 계획에는 미결정 항목이 없고, 생산 코드 변경 전 실패하는 구조 테스트를 실행한다.
