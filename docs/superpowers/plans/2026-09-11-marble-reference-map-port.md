# 마블 룰렛 참고 맵 직접 이식 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `lazygyu/roulette`의 첫 번째 맵을 NotMe 코스 데이터로 직접 이식해 연속 충돌 경로와 폭 0.9의 골인 입구를 구현한다.

**Architecture:** 현재 `CourseDefinition`과 Box2D·Canvas API는 유지하고 `course.ts`의 데이터만 교체한다. 참고 맵의 polyline은 연속 `line`, 정적 box는 `box`, kinematic box는 `spinner`로 표현한다. UI와 레이스 상태 로직은 변경하지 않는다.

**Tech Stack:** TypeScript, React, Box2D WASM, Vitest, Vite

**Spec:** `docs/superpowers/specs/2026-09-11-marble-reference-map-port-design.md`

## Global Constraints

- 코스 너비는 `26`, 뷰포트 높이는 `24`, 골인 y는 `111`이다.
- 중력 `(0, 10)`과 구슬 반경 `0.25`는 변경하지 않는다.
- 골인 입구는 x=`15.1~16`, 폭 `0.9`다.
- 참고 맵에 없는 현재 원형 범퍼·큰 사각 범퍼·하단 회전봉은 남기지 않는다.
- 참가자, 이름·색상, 스킬, 배속, 순위, 결과, 다시하기 UI는 변경하지 않는다.
- 검증은 타겟 테스트, 고정 시드 통합 테스트, 실제 레이스, build를 각각 한 번씩만 수행한다.

---

### Task 1: 참고 맵 구조 계약 작성

**Files:**
- Modify: `src/features/marble/engine/course.test.ts`
- Test: `src/features/marble/engine/course.test.ts`

**Interfaces:**
- Consumes: `NOTME_COURSE: CourseDefinition`, `CourseObstacle`
- Produces: 참고 이동벽, 장애물 수, 회전봉, 골인 입구의 좌표 계약

- [ ] **Step 1: 기존 커스텀 코스 기대값을 참고 맵 계약으로 교체**

`course.test.ts`에서 `goalY`, box·spinner 개수, 기존 지그재그 벽과 결승 테스트를 다음 계약으로 교체한다.

```ts
expect(NOTME_COURSE.goalY).toBe(111);

const obstacles = NOTME_COURSE.sections.flatMap(({ obstacles }) => obstacles);
const boxes = obstacles.filter((obstacle): obstacle is Box => obstacle.kind === 'box');
const spinners = obstacles.filter(isSpinner);

expect(boxes).toHaveLength(36);
expect(obstacles.filter(({ kind }) => kind === 'circle')).toHaveLength(0);
expect(spinners).toMatchObject([
  { id: 'spinner:row-1', center: { x: 8, y: 75 }, length: 2, angularVelocity: 3.5 },
  { id: 'spinner:row-2', center: { x: 12, y: 75 }, length: 2, angularVelocity: -3.5 },
  { id: 'spinner:row-3', center: { x: 16, y: 75 }, length: 2, angularVelocity: 3.5 },
  { id: 'spinner:row-4', center: { x: 20, y: 75 }, length: 2, angularVelocity: -3.5 },
  { id: 'spinner:row-5', center: { x: 24, y: 75 }, length: 2, angularVelocity: 3.5 },
  { id: 'spinner:finish-gate', center: { x: 14, y: 106.75 }, length: 2, angularVelocity: -1.2 },
]);
```

연속 이동벽과 내부 폐쇄 구조물은 다음 선분이 포함되는지 확인한다.

```ts
expect(obstacles.filter(isLine)).toEqual(expect.arrayContaining([
  { kind: 'line', from: { x: 9.25, y: 0 }, to: { x: 9.25, y: 8.5 } },
  { kind: 'line', from: { x: 9.25, y: 8.5 }, to: { x: 2, y: 19.25 } },
  { kind: 'line', from: { x: 16.5, y: 9.25 }, to: { x: 9.5, y: 20 } },
  { kind: 'line', from: { x: 1.25, y: 53.75 }, to: { x: 8.25, y: 58.75 } },
  { kind: 'line', from: { x: 19, y: 55.5 }, to: { x: 24, y: 59.25 } },
  { kind: 'line', from: { x: 12.75, y: 37.5 }, to: { x: 7, y: 43.5 } },
  { kind: 'line', from: { x: 14.75, y: 43 }, to: { x: 17.5, y: 40.25 } },
  { kind: 'line', from: { x: 8.25, y: 99.25 }, to: { x: 15.1, y: 106.75 } },
  { kind: 'line', from: { x: 24, y: 100.5 }, to: { x: 16, y: 106.75 } },
  { kind: 'line', from: { x: 15.1, y: 106.75 }, to: { x: 15.1, y: 111 } },
  { kind: 'line', from: { x: 16, y: 106.75 }, to: { x: 16, y: 111 } },
]));

expect(NOTME_COURSE.goalSensor).toEqual({
  from: { x: 15.1, y: 111 },
  to: { x: 16, y: 111 },
});
expect(NOTME_COURSE.goalSensor.to.x - NOTME_COURSE.goalSensor.from.x).toBeCloseTo(0.9, 5);
```

- [ ] **Step 2: 구조 테스트를 실행해 RED 확인**

Run: `npm test -- src/features/marble/engine/course.test.ts`

Expected: 기존 `goalY=135`, box 18개 이상, spinner 10개, 폭 1.2 좌표 때문에 FAIL.

- [ ] **Step 3: 테스트 변경 커밋**

```bash
git add src/features/marble/engine/course.test.ts
git commit -m "참고 마블 맵 구조 계약 추가"
```

---

### Task 2: 참고 첫 맵 코스 데이터 이식

**Files:**
- Modify: `src/features/marble/engine/course.ts`
- Test: `src/features/marble/engine/course.test.ts`

**Interfaces:**
- Consumes: `CoursePoint`, `LineObstacle`, `BoxObstacle`, `CourseDefinition`
- Produces: `NOTME_COURSE: CourseDefinition`

- [ ] **Step 1: 연속 이동벽 좌표 교체**

`LEFT_CORRIDOR`, `RIGHT_CORRIDOR`를 다음 값으로 교체한다.

```ts
const LEFT_CORRIDOR = [
  { x: 9.25, y: 0 }, { x: 9.25, y: 8.5 }, { x: 2, y: 19.25 },
  { x: 2, y: 26 }, { x: 9.75, y: 30 }, { x: 9.75, y: 33.5 },
  { x: 1.25, y: 41 }, { x: 1.25, y: 53.75 }, { x: 8.25, y: 58.75 },
  { x: 8.25, y: 63 }, { x: 9.25, y: 64 }, { x: 8.25, y: 65 },
  { x: 8.25, y: 99.25 }, { x: 15.1, y: 106.75 }, { x: 15.1, y: 111 },
] as const satisfies readonly CoursePoint[];

const RIGHT_CORRIDOR = [
  { x: 16.5, y: 0 }, { x: 16.5, y: 9.25 }, { x: 9.5, y: 20 },
  { x: 9.5, y: 22.5 }, { x: 17.5, y: 26 }, { x: 17.5, y: 33.5 },
  { x: 24, y: 38.5 }, { x: 19, y: 45.5 }, { x: 19, y: 55.5 },
  { x: 24, y: 59.25 }, { x: 24, y: 63 }, { x: 23, y: 64 },
  { x: 24, y: 65 }, { x: 24, y: 100.5 }, { x: 16, y: 106.75 },
  { x: 16, y: 111 },
] as const satisfies readonly CoursePoint[];
```

`goalY`를 `111`, `goalSensor`를 x=`15.1~16`으로 바꾼다. 외곽 안전벽의 하단 y도 모두 `111`로 바꾼다.

- [ ] **Step 2: 내부 폐쇄 구조물과 정적 box 생성**

파일 내부 상수로 정확한 참고 좌표를 둔다.

```ts
const INNER_LINES = [
  ...toLines([
    { x: 12.75, y: 37.5 }, { x: 7, y: 43.5 }, { x: 7, y: 49.75 },
    { x: 12.75, y: 53.75 }, { x: 12.75, y: 37.5 },
  ]),
  ...toLines([
    { x: 14.75, y: 37.5 }, { x: 14.75, y: 43 },
    { x: 17.5, y: 40.25 }, { x: 14.75, y: 37.5 },
  ]),
] satisfies LineObstacle[];

const CHEVRON_X = [9.4, 11.3, 13.2, 15.1, 17, 18.9, 20.7, 22.7] as const;
const LOWER_PIN_ROWS = [
  { y: 92, xs: [9.5, 12.75, 16, 19.25, 22.5] },
  { y: 95, xs: [11, 14.25, 17.5, 20.75] },
  { y: 98, xs: [9.5, 12.75, 16, 19.25, 22.5] },
] as const;
```

box는 다음 규칙으로 생성한다.

```ts
const TOP_PINS = [
  B(15.5, 30, 0.2, 0.2, -Math.PI / 4, 1),
  B(15.5, 32, 0.2, 0.2, -Math.PI / 4),
  B(15.5, 28, 0.2, 0.2, -Math.PI / 4),
  B(12.5, 30, 0.2, 0.2, -Math.PI / 4),
  B(12.5, 32, 0.2, 0.2, -Math.PI / 4),
  B(12.5, 28, 0.2, 0.2, -Math.PI / 4),
];

const CHEVRONS = [
  ...CHEVRON_X.map((x) => B(x, 66.6, 0.6, 0.1, Math.PI / 4)),
  ...CHEVRON_X.map((x) => B(x, 69.1, 0.6, 0.1, -Math.PI / 4)),
];

const LOWER_PINS = LOWER_PIN_ROWS.flatMap(({ y, xs }) => (
  xs.map((x) => B(x, y, 0.25, 0.25, Math.PI / 4))
));
```

- [ ] **Step 3: 구간별 장애물과 회전봉 교체**

다섯 section은 기존 순서를 유지하되 다음 책임으로 나눈다.

```ts
sections: [
  { kind: 'ramps', obstacles: [
    ...toLines(LEFT_CORRIDOR.slice(0, 6)),
    ...toLines(RIGHT_CORRIDOR.slice(0, 6)),
    ...TOP_PINS,
  ] },
  { kind: 'pins', obstacles: [
    ...toLines(LEFT_CORRIDOR.slice(5, 12)),
    ...toLines(RIGHT_CORRIDOR.slice(5, 13)),
    ...INNER_LINES,
    ...CHEVRONS,
  ] },
  { kind: 'spinner', obstacles: [
    ...toLines(LEFT_CORRIDOR.slice(11, 13)),
    ...toLines(RIGHT_CORRIDOR.slice(12, 14)),
    { kind: 'spinner', id: 'spinner:row-1', center: { x: 8, y: 75 }, length: 2, angle: 0, angularVelocity: 3.5 },
    { kind: 'spinner', id: 'spinner:row-2', center: { x: 12, y: 75 }, length: 2, angle: 0, angularVelocity: -3.5 },
    { kind: 'spinner', id: 'spinner:row-3', center: { x: 16, y: 75 }, length: 2, angle: 0, angularVelocity: 3.5 },
    { kind: 'spinner', id: 'spinner:row-4', center: { x: 20, y: 75 }, length: 2, angle: 0, angularVelocity: -3.5 },
    { kind: 'spinner', id: 'spinner:row-5', center: { x: 24, y: 75 }, length: 2, angle: 0, angularVelocity: 3.5 },
  ] },
  { kind: 'fork', obstacles: [...LOWER_PINS] },
  { kind: 'finish', obstacles: [
    ...toLines(LEFT_CORRIDOR.slice(12)),
    ...toLines(RIGHT_CORRIDOR.slice(13)),
    { kind: 'spinner', id: 'spinner:finish-gate', center: { x: 14, y: 106.75 }, length: 2, angle: 0, angularVelocity: -1.2 },
  ] },
],
```

현재 `circle`, 큰 `box`, `spinner:upper-*`, `spinner:lower-*` 정의는 모두 제거한다.

- [ ] **Step 4: 구조 테스트 GREEN 확인**

Run: `npm test -- src/features/marble/engine/course.test.ts`

Expected: 11 tests PASS, `validateCourse(NOTME_COURSE)` 오류 없음.

- [ ] **Step 5: 코스 데이터 커밋**

```bash
git add src/features/marble/engine/course.ts src/features/marble/engine/course.test.ts
git commit -m "참고 첫 마블 맵 코스 이식"
```

---

### Task 3: 물리·화면 완료 검증과 배포 준비

**Files:**
- Modify only if failure proves necessary: `src/features/marble/engine/course.ts`
- Test: `src/features/marble/engine/RouletteEngine.integration.test.ts`

**Interfaces:**
- Consumes: `RouletteEngine`, `NOTME_COURSE`, browser canvas rendering
- Produces: 100구슬 완주 증거와 실제 화면 확인 결과

- [ ] **Step 1: 고정 시드 통합 테스트 한 번 실행**

Run: `npm test -- src/features/marble/engine/RouletteEngine.integration.test.ts`

Expected: 100개 구슬이 120초 내 모두 x=`15.1~16` 골인 센서를 유효하게 통과하고 PASS.

실패하면 추가 시드를 돌리지 않는다. 정체 구슬의 마지막 x/y만 한 번 출력해 해당 위치의 참고 좌표 변환 결함만 수정한 뒤 같은 테스트를 한 번 재실행한다.

- [ ] **Step 2: 로컬 실제 레이스 한 번 확인**

Run: `npm run dev -- --host 127.0.0.1`

한 번의 레이스에서 다음 세 장면만 확인한다.

1. 미니맵에 참고 맵과 같은 두 연속 굴곡 벽과 내부 사각·삼각 구조가 보인다.
2. 구슬이 y=66.6~75의 정적 막대와 회전봉 구간에서 반복 충돌한다.
3. 결승의 폭 0.9 입구 앞에서 구슬이 반시계 회전봉에 걸렸다가 한 개씩 통과한다.

확인 후 개발 서버를 종료한다. 화면이 다르면 수치 테스트 통과만으로 완료 처리하지 않는다.

- [ ] **Step 3: production build 한 번 실행**

Run: `npm run build`

Expected: TypeScript와 Vite production build PASS. Box2D의 `fs`, `path` browser external 경고는 기존 알려진 경고이며 실패로 취급하지 않는다.

- [ ] **Step 4: 최종 diff 확인**

Run: `git diff --check && git status --short`

Expected: 공백 오류 없음. 코스 이식과 그 테스트 외 제품 코드 변경 없음.

- [ ] **Step 5: 필요한 최종 보정이 있을 때만 커밋**

```bash
git add src/features/marble/engine/course.ts src/features/marble/engine/course.test.ts
git commit -m "참고 마블 맵 완주 흐름 보정"
```

- [ ] **Step 6: main 푸시**

Run: `git push origin main`

Expected: 구현 커밋이 GitHub `main`에 반영되고 Vercel 자동 배포가 시작됨.

## Self-review

- 설계의 연속 벽, 내부 구조물, box 36개, 회전봉 6개, 폭 0.9 결승 입구를 Task 1~2가 모두 다룬다.
- 중력·물리 API·UI 유지 조건은 Global Constraints와 Task 3 diff 확인에 포함했다.
- 테스트 반복 제한과 실패 시 단일 진단 절차를 Task 3에 명시했다.
- 좌표, 타입, ID, 테스트 명령에 미결정 값이나 placeholder가 없다.
