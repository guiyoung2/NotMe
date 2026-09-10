# 마블 룰렛 코스 긴장감 개선 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 단일 마블 코스를 다단계 장애물과 중앙 깔때기 골인으로 재구성하고, 공정하게 체감되는 스킬과 충격파 표시를 추가한다.

**Architecture:** 기존 `line`·`circle`·`spinner` 물리 타입과 Canvas 렌더러를 유지한다. 코스 데이터가 경기 리듬과 좁은 골인 통로를 정의하고, `SkillSystem`은 활성 구슬 중 균등 대상을 반환하며, `RouletteEngine`이 물리 충격과 수명이 있는 효과 snapshot을 연결한다.

**Tech Stack:** React 19, TypeScript, Vitest, Box2D WASM, Canvas 2D, Playwright

**Spec:** `docs/superpowers/specs/2026-09-10-marble-course-tension-design.md`

## Global Constraints

- 맵 선택 UI를 추가하지 않고 한 가지 코스만 유지한다.
- 구슬의 크기·밀도와 참가자별 가중치를 바꾸지 않는다.
- 골인 센서는 중앙 배출구 안에만 존재하고 센서 바깥 통과는 순위로 인정하지 않는다.
- 스킬 대상은 활성 구슬 중 균등하게 선택하며 비활성화 시 난수와 충격을 모두 소비하지 않는다.
- 모바일·데스크톱 100구슬 완주 60초 이하와 frame p95 32ms 이하를 유지한다.
- lazygyu/roulette MIT 고지와 기존 배포 라이선스 경로를 유지한다.

---

## File Structure

- `src/features/marble/engine/course.ts` — 단일 코스 좌표와 좁은 센서 검증
- `src/features/marble/engine/course.test.ts` — 코스 구간·깔때기·회전 방향·센서 계약
- `src/features/marble/engine/SkillSystem.ts` — 전역 무작위 발동 간격과 균등 대상 선택
- `src/features/marble/engine/SkillSystem.test.ts` — 결정적 발동 시점·대상·비활성 상태
- `src/features/marble/engine/types.ts` — 충격파 snapshot 타입
- `src/features/marble/engine/RouletteEngine.ts` — 스킬 물리 호출과 효과 수명
- `src/features/marble/engine/RouletteEngine.test.ts` — 엔진 스킬·골인·snapshot 단위 회귀
- `src/features/marble/engine/RouletteEngine.integration.test.ts` — 실제 Box2D 완주와 스킬 재현성
- `src/features/marble/engine/Box2dPhysics.test.ts` — 실제 충격 물리의 방향과 이동
- `src/features/marble/engine/CanvasRenderer.ts` — 메인·미니맵 충격파 렌더
- `src/features/marble/engine/CanvasRenderer.test.ts` — 반경·감쇠·색상 렌더 계약
- `src/features/marble/MarbleResultCourse.tsx` — 결과용 빈 효과 snapshot
- `src/features/marble/MarbleRace.tsx` — E2E 진단에 누적 스킬 발동 수 전달
- `src/vite-env.d.ts` — E2E 진단 타입
- `e2e/marble.spec.ts` — 실제 스킬 발동, 좁은 골인, 성능과 결과 흐름

### Task 1: 다단계 코스와 중앙 깔때기 골인

**Files:**
- Modify: `src/features/marble/engine/course.test.ts`
- Modify: `src/features/marble/engine/RouletteEngine.test.ts`
- Modify: `src/features/marble/engine/course.ts`

**Interfaces:**
- Consumes: `CourseDefinition`, 기존 `line | circle | spinner` 형상
- Produces: 좁은 `goalSensor`, 최소 5개 양방향 spinner, 중앙 깔때기와 배출구를 가진 `NOTME_COURSE`

- [ ] **Step 1: 골인과 코스 리듬의 실패 테스트를 작성한다**

`course.test.ts`에 다음 사용자 결과를 검사한다.

```ts
it('작은 핀과 양방향 회전봉을 거쳐 중앙 깔때기로 골인한다', () => {
  const obstacles = NOTME_COURSE.sections.flatMap(({ obstacles }) => obstacles);
  const pins = obstacles.filter(({ kind }) => kind === 'circle');
  const spinners = obstacles.filter(({ kind }) => kind === 'spinner');
  const goalLeft = Math.min(NOTME_COURSE.goalSensor.from.x, NOTME_COURSE.goalSensor.to.x);
  const goalRight = Math.max(NOTME_COURSE.goalSensor.from.x, NOTME_COURSE.goalSensor.to.x);

  expect(pins.length).toBeGreaterThanOrEqual(12);
  expect(Math.max(...pins.map((pin) => pin.kind === 'circle' ? pin.radius : 0))).toBeLessThanOrEqual(0.6);
  expect(spinners.length).toBeGreaterThanOrEqual(5);
  expect(spinners.some((spinner) => spinner.kind === 'spinner' && spinner.angularVelocity > 0)).toBe(true);
  expect(spinners.some((spinner) => spinner.kind === 'spinner' && spinner.angularVelocity < 0)).toBe(true);
  expect(goalRight - goalLeft).toBeGreaterThan(0.5);
  expect(goalRight - goalLeft).toBeLessThan(NOTME_COURSE.width / 4);
  expect((goalLeft + goalRight) / 2).toBe(NOTME_COURSE.width / 2);
});
```

`RouletteEngine.test.ts`에는 같은 y 교차에서 중앙 구슬만 골인하고 센서 바깥 구슬은 출발 위치로 복귀하는 실제 엔진 경계 테스트를 추가한다. 기대 순위와 복귀 좌표는 literal로 검사하고, 엔진의 센서 계산 helper를 기대값 생성에 사용하지 않는다.

- [ ] **Step 2: 테스트가 현재 전폭 센서·2개 회전봉·큰 핀 때문에 실패하는지 확인한다**

Run:

```bash
npm test -- src/features/marble/engine/course.test.ts src/features/marble/engine/RouletteEngine.test.ts
```

Expected: 회전봉 수, 핀 크기·수, 센서 폭, 센서 밖 골인 처리 검사가 FAIL.

- [ ] **Step 3: 현재 형상 타입만 사용해 코스를 재구성한다**

`course.ts`에서 분산 램프 → 작은 핀 필드 → 교차 회전봉 → 분기·재합류 → 중앙 깔때기 순서를 유지한다. 깔때기 목 아래에 수직 벽 두 개와 마지막 회전봉을 두고 `goalSensor`를 두 수직 벽 사이로 제한한다.

센서 검증은 전폭 강제를 제거하고 다음 계약으로 바꾼다.

```ts
function isValidGoalSensor(course: CourseDefinition): boolean {
  const left = Math.min(course.goalSensor.from.x, course.goalSensor.to.x);
  const right = Math.max(course.goalSensor.from.x, course.goalSensor.to.x);
  return course.goalSensor.from.y === course.goalY
    && course.goalSensor.to.y === course.goalY
    && right > left;
}
```

기존 경계 검사와 0길이 거부는 유지한다. 좌표를 옮길 때 시작 구슬과 최초 램프가 겹치지 않게 `y >= 8`을 유지한다.

- [ ] **Step 4: 코스·엔진 단위 테스트를 통과시킨다**

Run:

```bash
npm test -- src/features/marble/engine/course.test.ts src/features/marble/engine/RouletteEngine.test.ts
```

Expected: PASS.

- [ ] **Step 5: 실제 Box2D 기준 검사를 실행한다**

Run:

```bash
npm test -- src/features/marble/engine/RouletteEngine.integration.test.ts
```

Expected: 기존 seed 1~5에서 스킬 on/off 모두 100구슬 완주 PASS. 실패하면 정체 위치를 기록하고 그 위치와 직접 맞닿은 간격만 조정한다.

- [ ] **Step 6: 커밋한다**

```bash
git add src/features/marble/engine/course.ts src/features/marble/engine/course.test.ts src/features/marble/engine/RouletteEngine.test.ts
git commit -m "마블 코스를 중앙 깔때기 구조로 개선"
```

### Task 2: 공정한 스킬 발동과 효과 수명

**Files:**
- Create: `src/features/marble/engine/SkillSystem.test.ts`
- Modify: `src/features/marble/engine/SkillSystem.ts`
- Modify: `src/features/marble/engine/types.ts`
- Modify: `src/features/marble/engine/RouletteEngine.ts`
- Modify: `src/features/marble/engine/RouletteEngine.test.ts`
- Modify: `src/features/marble/engine/RouletteEngine.integration.test.ts`
- Modify: `src/features/marble/engine/Box2dPhysics.test.ts`
- Modify: `src/features/marble/MarbleResultCourse.tsx`
- Modify: `src/features/marble/MarbleRace.test.tsx`
- Modify: `src/features/marble/MarblePage.test.tsx`
- Modify: `src/features/marble/engine/Camera.test.ts`
- Modify: `src/features/marble/engine/CanvasRenderer.test.ts`

**Interfaces:**
- Consumes: 활성 구슬 ID, 10ms fixed step, 주입된 `RandomSource`, `PhysicsAdapter.impact(id)`
- Produces: `SkillSystem.update(ids, elapsedMs): string | null`, `SkillEffectSnapshot`, `RaceSnapshot.skillEffects`, `RaceSnapshot.skillActivationCount`

- [ ] **Step 1: SkillSystem의 실패 테스트를 작성한다**

`SkillSystem.test.ts`에 literal 난수열을 사용한다. 첫 난수는 6~8초 간격, 두 번째 난수는 균등 대상 index를 결정한다.

```ts
it('6초 뒤 활성 구슬 중 하나를 동일한 index 규칙으로 선택한다', () => {
  const values = [0, 0.5, 1];
  const system = new SkillSystem(() => values.shift()!);

  expect(system.update(['a', 'b', 'c'], 5_990)).toBeNull();
  expect(system.update(['a', 'b', 'c'], 10)).toBe('b');
});
```

빈 ID에서는 난수를 소비하지 않는 검사, `clear()` 후 새 간격으로 시작하는 검사도 분리해 작성한다. 비활성화 시 난수 비소비는 엔진 테스트에서 검사한다.

- [ ] **Step 2: 현재 per-marble 5초·2% 구현 때문에 테스트가 실패하는지 확인한다**

Run:

```bash
npm test -- src/features/marble/engine/SkillSystem.test.ts
```

Expected: 새 반환 계약이 없어 FAIL.

- [ ] **Step 3: 전역 스킬 스케줄을 최소 구현한다**

`SkillSystem`은 첫 active update에서만 다음 간격을 예약한다. 간격은 `6_000 + random() * 2_000`ms이고, 만료 시 `Math.min(ids.length - 1, Math.floor(random() * ids.length))`로 한 ID를 반환한 뒤 다음 간격을 예약한다. `clear()`는 예약 상태를 제거한다. 물리 호출은 엔진으로 이동한다.

- [ ] **Step 4: 효과 snapshot과 엔진 수명을 실패 테스트로 고정한다**

`types.ts`에 다음 타입을 추가하고 `RaceSnapshot`에 배열을 요구한다.

```ts
export interface SkillEffectSnapshot {
  id: number;
  center: CoursePoint;
  elapsedMs: number;
  durationMs: 500;
}
```

`RaceSnapshot`에는 `skillEffects: SkillEffectSnapshot[]`와 `skillActivationCount: number`를 필수로 둔다. `RouletteEngine.test.ts`에서 결정적 난수로 6초 뒤 선택된 ID 하나만 `impact`되는지, snapshot 효과 중심이 발동 전 body 위치와 일치하는지, 누적 count가 1인지, 499ms에는 남고 500ms에는 제거되는지 검사한다. 스킬 off에서는 10초 동안 난수·impact·효과·누적 count가 모두 없어야 한다. `MarbleResultCourse`와 기존 Camera·Canvas·Race·Page 테스트 fixture에는 빈 효과와 count 0을 명시한다.

`Box2dPhysics.test.ts`에는 가까운 두 구슬을 만들고 한 구슬에서 `impact`를 호출한 뒤 10ms step 후 다른 구슬의 x가 발동 구슬 반대 방향으로 증가하는 실제 물리 검사를 추가한다. 이 검사가 현재 구현에서 통과하면 `IMPACT_RADIUS`와 `IMPACT_IMPULSE`는 변경하지 않는다. 실패할 때만 계산식의 실제 위치·거리·impulse를 추적하고 별도 실패 테스트 후 최소 수정한다.

- [ ] **Step 5: 엔진 효과 연결을 구현한다**

엔진이 매 fixed step에서 기존 효과의 `elapsedMs`를 증가시키고 500ms 이상을 제거한다. 스킬이 ID를 반환하면 해당 active body 위치로 효과를 추가하고 `physics.impact(id)`를 한 번 호출한다. `destroy()`는 효과와 스킬 예약을 비운다. 골인 구슬을 대상으로 선택하지 않도록 finish 처리 뒤의 `remainingIds`만 전달한다.

- [ ] **Step 6: 스킬 단위·통합 테스트를 통과시킨다**

Run:

```bash
npm test -- src/features/marble/engine/SkillSystem.test.ts src/features/marble/engine/RouletteEngine.test.ts src/features/marble/engine/Box2dPhysics.test.ts src/features/marble/engine/RouletteEngine.integration.test.ts src/features/marble/engine/Camera.test.ts src/features/marble/engine/CanvasRenderer.test.ts src/features/marble/MarbleRace.test.tsx src/features/marble/MarblePage.test.tsx
```

Expected: 스킬 on/off, 효과 수명, 실제 Box2D 100구슬 seed 재현 PASS.

- [ ] **Step 7: 커밋한다**

```bash
git add src/features/marble/engine/SkillSystem.ts src/features/marble/engine/SkillSystem.test.ts src/features/marble/engine/types.ts src/features/marble/engine/RouletteEngine.ts src/features/marble/engine/RouletteEngine.test.ts src/features/marble/engine/RouletteEngine.integration.test.ts src/features/marble/engine/Box2dPhysics.test.ts src/features/marble/engine/Camera.test.ts src/features/marble/engine/CanvasRenderer.test.ts src/features/marble/MarbleResultCourse.tsx src/features/marble/MarbleRace.test.tsx src/features/marble/MarblePage.test.tsx
git commit -m "마블 스킬 발동과 충격파 상태 개선"
```

### Task 3: 충격파 Canvas 표시

**Files:**
- Modify: `src/features/marble/engine/CanvasRenderer.test.ts`
- Modify: `src/features/marble/engine/CanvasRenderer.ts`

**Interfaces:**
- Consumes: `RaceSnapshot.skillEffects`
- Produces: 메인 Canvas와 미니맵의 `#7dd3fc` 확장·감쇠 원

- [ ] **Step 1: 렌더링 실패 테스트를 작성한다**

Canvas recording context에 `globalAlpha` 기록을 포함하고, 250ms 지난 효과 하나를 render한다. 몸체 원과 구분되는 충격파 arc의 중심, 반경 `2.75`, 색 `#7dd3fc`, alpha `0.75`를 literal로 검사한다. 메인과 미니맵 양쪽에 한 번씩 그려지는지 확인한다.

- [ ] **Step 2: 현재 renderer가 효과를 그리지 않아 실패하는지 확인한다**

Run:

```bash
npm test -- src/features/marble/engine/CanvasRenderer.test.ts
```

Expected: 충격파 arc가 없어 FAIL.

- [ ] **Step 3: 메인·미니맵 효과 렌더를 구현한다**

진행률 `progress = elapsedMs / durationMs`, 반경 `0.5 + progress * 4.5`, alpha `1 - progress * progress`를 사용한다. 색은 `#7dd3fc`, 선 두께는 카메라 배율과 무관하게 화면에서 일정하게 유지한다. `save/restore`로 alpha와 strokeStyle이 코스·구슬 렌더에 새지 않게 한다.

- [ ] **Step 4: Canvas와 관련 snapshot 테스트를 통과시킨다**

Run:

```bash
npm test -- src/features/marble/engine/CanvasRenderer.test.ts src/features/marble/MarbleRace.test.tsx src/features/marble/MarblePage.test.tsx
```

Expected: PASS.

- [ ] **Step 5: 커밋한다**

```bash
git add src/features/marble/engine/CanvasRenderer.ts src/features/marble/engine/CanvasRenderer.test.ts
git commit -m "마블 스킬 충격파를 코스에 표시"
```

### Task 4: 실제 브라우저 긴장감·성능 검증

**Files:**
- Modify: `src/features/marble/MarbleRace.tsx`
- Modify: `src/vite-env.d.ts`
- Modify: `e2e/marble.spec.ts`

**Interfaces:**
- Consumes: 누적 스킬 발동 수, 좁은 골인 코스, 기존 E2E debug snapshot
- Produces: 실제 브라우저 스킬 발동·100구슬 완주·프레임 회귀 검증

- [ ] **Step 1: E2E 진단 실패 검사를 작성한다**

E2E 전용 `window.__NOTME_RACE_DEBUG__`에 `skillActivationCount`를 추가한다. 스킬을 켠 100구슬 레이스에서 5초 안에 값이 1 이상이 되고 도착 100/100까지 진행되는지 검사한다. production 기본 빌드에서는 기존처럼 진단 전역 자체가 없어야 한다.

- [ ] **Step 2: 진단 값 부재로 검사가 실패하는지 확인한다**

Run:

```bash
npm run build:e2e
npm run test:e2e -- e2e/marble.spec.ts --grep "스킬|100개 구슬" --workers=1
```

Expected: `skillActivationCount` 부재로 FAIL.

- [ ] **Step 3: E2E 전용 누적 값을 연결한다**

`RaceSnapshot.skillActivationCount`를 기존 debug snapshot의 같은 이름 필드에 전달한다. `VITE_E2E=true` 분기 밖의 production 전역에는 노출하지 않는다. 렌더 성능 측정 frame 배열과 기존 필드는 유지한다.

- [ ] **Step 4: 전체 자동 검증을 실행한다**

Run:

```bash
npm run verify
```

Expected: TypeScript, 단위 테스트, production 진단 비노출, 모바일·데스크톱 전체 E2E PASS.

- [ ] **Step 5: 100구슬 성능을 3회 반복한다**

Run:

```bash
npm run test:e2e -- e2e/marble.spec.ts --grep "100개 구슬" --repeat-each=3 --workers=1
```

Expected: mobile·desktop 모든 반복에서 60초 안에 100/100, frame p95 32ms 이하, 누락 frame 0, 스킬 활성 시 activation count 1 이상.

- [ ] **Step 6: 모바일 시각 검토를 수행한다**

390×844에서 100구슬·스킬 on으로 실행해 초반, 회전봉 구간, 깔때기 골인, 충격파 발동 프레임과 최종 결과를 캡처한다. 다음을 직접 확인한다.

- 명단·미니맵이 Canvas를 덮지 않는다.
- 작은 핀과 최소 5개 회전봉이 구간별로 분리되어 보인다.
- 마지막 중앙 깔때기와 목 회전봉 뒤의 좁은 배출구가 보인다.
- 충격파가 구슬·이름을 영구적으로 가리지 않고 500ms 안에 사라진다.

- [ ] **Step 7: 커밋하고 푸시한다**

```bash
git add src/features/marble/MarbleRace.tsx src/vite-env.d.ts e2e/marble.spec.ts
git commit -m "마블 코스와 스킬 브라우저 검증 보강"
git push origin codex/marble-course-tension
```
