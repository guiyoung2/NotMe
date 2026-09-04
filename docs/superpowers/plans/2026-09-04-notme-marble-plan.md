# NotMe 마블 룰렛 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 참가자별 구슬 수, 첫 번째·마지막 당첨, 긴 세로 코스, 카메라·미니맵·동등한 스킬·누르는 동안 4배속을 갖춘 마블 룰렛을 만든다.

**Architecture:** `lazygyu/roulette`의 MIT 코드에서 Box2D 어댑터와 렌더링 개념을 선별 이식하되 React 설정 화면과 엔진 수명은 새 인터페이스로 분리한다. 엔진은 고정 시간 간격으로 물리를 계산하고 한 방향 이벤트 스냅샷을 React에 전달한다. 참가자별 확률 차이는 구슬 개수로만 만들고 개별 무게는 제거한다.

**Tech Stack:** React, TypeScript, Canvas 2D, box2d-wasm, Vitest, Testing Library, Playwright

**Spec:** `docs/superpowers/specs/2026-09-04-notme-mvp-design.md`

## Global Constraints

- 원 저장소의 MIT 저작권과 라이선스를 유지한다.
- MVP는 화면 약 다섯 높이의 긴 세로 코스 하나만 제공한다.
- 참가자는 제한 없이 추가할 수 있고 참가자별 구슬 수는 1~100, 전체 합은 최대 100이다.
- 개별 물리 무게와 스킬 확률 가중치는 없으며 모든 구슬의 속성이 같다.
- 첫 번째 또는 마지막 도착 구슬을 당첨으로 선택한다.
- 미니맵, 카메라 추적, 동등한 충돌 스킬과 포인터를 누르는 동안 4배속을 제공한다.
- 광고, 녹화, 외부 상점, 여러 맵, 커스텀 순위와 기존 사이트 UI를 포함하지 않는다.

---

## File Structure

- `LICENSES/lazygyu-roulette-MIT.txt` — 원본 MIT 라이선스 전문
- `THIRD_PARTY_NOTICES.md` — 참고 범위와 원 저장소 링크
- `src/features/marble/marbleConfig.ts` — 참가자 입력 검증과 구슬 인스턴스 확장
- `src/features/marble/marbleConfig.test.ts` — 100개 한도와 구슬 복제 테스트
- `src/features/marble/engine/types.ts` — 엔진 공개 타입
- `src/features/marble/engine/Box2dPhysics.ts` — Box2D 초기화·스테이지·구슬·충격 어댑터
- `src/features/marble/engine/course.ts` — 단일 긴 코스 데이터
- `src/features/marble/engine/Camera.ts` — 대상 구슬 추적과 골인 줌
- `src/features/marble/engine/SkillSystem.ts` — 모든 구슬에 동일한 충돌 스킬 쿨다운
- `src/features/marble/engine/RouletteEngine.ts` — 고정 스텝, 순위, 속도, 수명
- `src/features/marble/engine/RouletteEngine.test.ts` — 순위·종료·배속 단위 테스트
- `src/features/marble/engine/CanvasRenderer.ts` — 코스·구슬·순위·미니맵 렌더링
- `src/features/marble/MarbleSetup.tsx` — 참가자와 구슬 수, 옵션
- `src/features/marble/MarbleRace.tsx` — Canvas 수명과 포인터 입력
- `src/features/marble/MarblePage.tsx` — 설정·레이스·결과와 복구
- `src/features/marble/MarblePage.test.tsx` — 설정과 화면 전환 테스트
- `src/features/marble/marble.css` — 전체 높이 레이스 UI

### Task 1: MIT 고지와 참고 코드 경계

**Files:**
- Create: `LICENSES/lazygyu-roulette-MIT.txt`
- Create: `THIRD_PARTY_NOTICES.md`
- Create: `README.md`

**Interfaces:**
- Consumes: `https://github.com/lazygyu/roulette`, copyright 2023 LazyGyu
- Produces: 배포와 저장소에 포함되는 라이선스 고지

- [ ] **Step 1: MIT 전문을 저장한다**

원 저장소 `LICENSE`의 MIT 전문을 변경 없이 `LICENSES/lazygyu-roulette-MIT.txt`에 복사한다. 저작권 줄 `Copyright (c) 2023 LazyGyu`를 유지한다.

- [ ] **Step 2: 참고 범위를 문서화한다**

```md
## Marble Roulette

NotMe의 마블 룰렛 엔진은 [lazygyu/roulette](https://github.com/lazygyu/roulette)의
Box2D 연동, 코스 표현, 카메라, 미니맵, 배속, 순위와 스킬 구현을 참고하거나 수정했습니다.
원 저작물은 MIT License이며 전문은 `LICENSES/lazygyu-roulette-MIT.txt`에 있습니다.
```

README의 라이선스 절에서 `THIRD_PARTY_NOTICES.md`로 연결한다.

- [ ] **Step 3: 고지를 검사한다**

Run: `rg -n "LazyGyu|MIT License|lazygyu/roulette" README.md THIRD_PARTY_NOTICES.md LICENSES/lazygyu-roulette-MIT.txt`
Expected: 세 파일 모두 관련 고지를 포함.

- [ ] **Step 4: 커밋한다**

```bash
git add README.md THIRD_PARTY_NOTICES.md LICENSES
git commit -m "마블 룰렛 참고 코드 라이선스 명시"
```

### Task 2: 참가자 설정과 구슬 확장 규칙

**Files:**
- Create: `src/features/marble/marbleConfig.ts`
- Create: `src/features/marble/marbleConfig.test.ts`

**Interfaces:**
- Produces: `MarbleParticipant`; `MarbleSeed`; `validateMarbleParticipants(participants): MarbleValidation`; `expandMarbles(participants): MarbleSeed[]`; `shuffleMarbles(marbles, random): MarbleSeed[]`; `MAX_MARBLES = 100`

- [ ] **Step 1: 구슬 복제와 한도 실패 테스트를 작성한다**

```ts
it('참가자별 개수만큼 동일 속성의 구슬을 만든다', () => {
  expect(expandMarbles([
    { id: 'a', name: '짱구', count: 2 },
    { id: 'b', name: '철수', count: 1 },
  ])).toEqual([
    { id: 'a:0', participantId: 'a', name: '짱구' },
    { id: 'a:1', participantId: 'a', name: '짱구' },
    { id: 'b:0', participantId: 'b', name: '철수' },
  ]);
});

it('전체 101개는 시작할 수 없다', () => {
  const result = validateMarbleParticipants([{ id: 'a', name: '짱구', count: 101 }]);
  expect(result).toEqual({ valid: false, total: 101, overBy: 1 });
});
```

Run: `npm test -- src/features/marble/marbleConfig.test.ts`
Expected: FAIL because config functions do not exist.

- [ ] **Step 2: 설정 타입과 검증을 구현한다**

```ts
export const MAX_MARBLES = 100;
export type MarbleParticipant = { id: string; name: string; count: number };
export type MarbleSeed = { id: string; participantId: string; name: string };
```

검증은 참가자 2명 이상, trim된 이름, 각 count가 1~100 정수, 총합 2~100을 검사한다. `shuffleMarbles`는 복사본에 Fisher–Yates를 적용하고 전달받은 `RandomSource`만 사용한다.

- [ ] **Step 3: 설정 테스트를 실행한다**

Run: `npm test -- src/features/marble/marbleConfig.test.ts`
Expected: PASS.

- [ ] **Step 4: 커밋한다**

```bash
git add src/features/marble
git commit -m "룰렛 참가자와 구슬 수 규칙 추가"
```

### Task 3: Box2D 물리 어댑터

**Files:**
- Create: `src/features/marble/engine/types.ts`
- Create: `src/features/marble/engine/Box2dPhysics.ts`
- Create: `src/features/marble/engine/Box2dPhysics.test.ts`
- Modify: `package.json`
- Modify: `package-lock.json`

**Interfaces:**
- Consumes: `box2d-wasm`
- Produces: `PhysicsAdapter`; `Box2dPhysics`; `CourseDefinition`; `BodySnapshot`

- [ ] **Step 1: box2d-wasm을 설치하고 어댑터 계약 테스트를 작성한다**

Run: `npm install box2d-wasm`

```ts
it('중력 스텝 뒤 구슬의 y가 증가한다', async () => {
  const physics = new Box2dPhysics();
  await physics.init();
  physics.createCourse(testCourse);
  physics.createMarble({ id: 'a:0', x: 5, y: 1 });
  for (let index = 0; index < 60; index += 1) physics.step(1 / 60);
  expect(physics.getMarble('a:0')!.y).toBeGreaterThan(1);
  physics.destroy();
});
```

Run: `npm test -- src/features/marble/engine/Box2dPhysics.test.ts`
Expected: FAIL because adapter does not exist.

- [ ] **Step 2: 물리 계약과 최소 어댑터를 구현한다**

```ts
export interface PhysicsAdapter {
  init(): Promise<void>;
  createCourse(course: CourseDefinition): void;
  createMarble(seed: { id: string; x: number; y: number }): void;
  step(seconds: number): void;
  getMarble(id: string): BodySnapshot | null;
  removeMarble(id: string): void;
  shakeMarble(id: string): void;
  impact(id: string): void;
  destroy(): void;
}
```

구슬은 모두 같은 반지름, density, restitution을 사용한다. ID와 Box2D body 매핑을 Map으로 유지하고 `destroy`에서 world와 WASM 객체 참조를 정리한다. 원본 `physics-box2d.ts`를 수정해 사용한 부분에는 원본 라이선스 헤더를 남긴다.

- [ ] **Step 3: 물리 테스트와 타입 검사를 실행한다**

Run: `npm test -- src/features/marble/engine/Box2dPhysics.test.ts && npm run typecheck`
Expected: PASS.

- [ ] **Step 4: 커밋한다**

```bash
git add package.json package-lock.json src/features/marble/engine
git commit -m "Box2D 룰렛 물리 어댑터 추가"
```

### Task 4: 단일 긴 코스

**Files:**
- Create: `src/features/marble/engine/course.ts`
- Create: `src/features/marble/engine/course.test.ts`

**Interfaces:**
- Consumes: `CourseDefinition`
- Produces: `NOTME_COURSE`; `validateCourse(course): string[]`

- [ ] **Step 1: 코스 구간과 골인 검증 테스트를 작성한다**

```ts
it('다섯 구간과 유효한 골인선을 가진다', () => {
  expect(NOTME_COURSE.sections.map(({ kind }) => kind)).toEqual([
    'ramps', 'pins', 'spinner', 'fork', 'finish',
  ]);
  expect(validateCourse(NOTME_COURSE)).toEqual([]);
  expect(NOTME_COURSE.goalY).toBeGreaterThan(NOTME_COURSE.viewportHeight * 4);
});
```

Run: `npm test -- src/features/marble/engine/course.test.ts`
Expected: FAIL because course does not exist.

- [ ] **Step 2: 명시적인 코스 데이터를 구현한다**

코스 너비 26, viewport 높이 24, goalY 120으로 정의한다. 왼쪽·오른쪽 외벽은 전체 높이를 막는다. `ramps`, `pins`, `spinner`, `fork`, `finish` 순서로 정적 선·원·회전 장애물 좌표를 배열에 작성한다. `validateCourse`는 외벽, 다섯 section, goalY 아래의 골인 센서, 코스 너비 밖 좌표를 검사한다.

- [ ] **Step 3: 코스 테스트를 실행한다**

Run: `npm test -- src/features/marble/engine/course.test.ts`
Expected: PASS.

- [ ] **Step 4: 커밋한다**

```bash
git add src/features/marble/engine/course.ts src/features/marble/engine/course.test.ts
git commit -m "NotMe 단일 마블 코스 추가"
```

### Task 5: 순위·스킬·배속 엔진

**Files:**
- Create: `src/features/marble/engine/SkillSystem.ts`
- Create: `src/features/marble/engine/RouletteEngine.ts`
- Create: `src/features/marble/engine/RouletteEngine.test.ts`

**Interfaces:**
- Consumes: `PhysicsAdapter`, `NOTME_COURSE`, `MarbleSeed`
- Produces: `RouletteEngine`; `FinishedMarble = MarbleSeed & { rank: number }`; `RaceSnapshot = { active: BodySnapshot[]; finishOrder: FinishedMarble[]; winner: FinishedMarble | null; speed: 1 | 4 }`; `WinnerMode = 'first' | 'last'`; `setFastForward(active: boolean)`

- [ ] **Step 1: 도착 순위와 종료 조건 테스트를 작성한다**

fake `PhysicsAdapter`로 세 구슬의 y를 직접 전진시킨다. 같은 구슬이 골인선을 여러 스텝 넘어도 한 번만 기록되는지, 모든 모드가 전체 순위를 확정할 때까지 진행하는지, `first`는 첫 도착을 선택하고 `last`는 마지막 도착을 선택하는지 테스트한다.

```ts
expect(engine.snapshot().finishOrder.map(({ id }) => id)).toEqual(['b:0', 'a:0', 'c:0']);
expect(engine.snapshot().winner?.id).toBe('c:0');
```

Run: `npm test -- src/features/marble/engine/RouletteEngine.test.ts`
Expected: FAIL because engine does not exist.

- [ ] **Step 2: 고정 스텝과 순위를 구현한다**

엔진은 누적 시간을 최대 100ms로 제한하고 10ms 고정 간격으로 `physics.step(0.01)`을 호출한다. 매 스텝 goalY를 넘은 ID를 Set으로 중복 차단하고 finishOrder에 추가한다. 마지막 한 구슬은 나머지가 모두 도착하면 순위를 확정한다. 첫 번째·마지막 모드 모두 전체 순위를 만든 뒤 종료하며 `winnerMode`에 따라 배열의 처음 또는 마지막 구슬을 winner로 지정한다.

- [ ] **Step 3: 동등한 스킬과 정체 해소를 구현한다**

`SkillSystem`은 모든 구슬 ID에 동일한 5초 쿨다운과 동일한 2% 발동 확률을 적용한다. 활성화 상태에서만 `physics.impact(id)`를 호출한다. 위치 변화가 3초간 임계값보다 작으면 `physics.shakeMarble(id)`를 호출하고 정체 시간을 초기화한다.

- [ ] **Step 4: 배속 테스트와 구현을 추가한다**

`setFastForward(true)`일 때 전달된 실시간 delta가 4배로 누적되고 `false`에서 즉시 1배로 돌아오는 테스트를 작성한다. 속도 변경은 물리 step 크기가 아니라 한 프레임에서 소비할 누적 시간에만 적용한다.

- [ ] **Step 5: 엔진 테스트를 실행한다**

Run: `npm test -- src/features/marble/engine/RouletteEngine.test.ts && npm run typecheck`
Expected: PASS.

- [ ] **Step 6: 커밋한다**

```bash
git add src/features/marble/engine
git commit -m "룰렛 순위 스킬 배속 엔진 구현"
```

### Task 6: 카메라·Canvas·미니맵

**Files:**
- Create: `src/features/marble/engine/Camera.ts`
- Create: `src/features/marble/engine/Camera.test.ts`
- Create: `src/features/marble/engine/CanvasRenderer.ts`
- Create: `src/features/marble/engine/CanvasRenderer.test.ts`

**Interfaces:**
- Consumes: `RaceSnapshot`, `CourseDefinition`
- Produces: `Camera.update(snapshot, course): CameraView`; `CanvasRenderer.render(context, snapshot, cameraView)`

- [ ] **Step 1: 카메라 대상과 범위 테스트를 작성한다**

첫 번째 모드는 선두 미도착 구슬, 마지막 모드는 후미 미도착 구슬을 목표로 선택하는지 테스트한다. 반환된 y가 코스 상단보다 작거나 골인선보다 커지지 않는지도 검증한다.

Run: `npm test -- src/features/marble/engine/Camera.test.ts`
Expected: FAIL because camera does not exist.

- [ ] **Step 2: 보간 카메라를 구현한다**

목표 y와 현재 y 차이의 10%를 프레임마다 이동하고 골인선 12단위 이내에서는 최대 2배까지 확대한다. `prefers-reduced-motion`은 카메라 보간을 끄지 않고 결과 축하 입자만 끄는 데 사용한다.

- [ ] **Step 3: Canvas 렌더 호출 테스트를 작성한다**

mock Canvas context에서 외벽·장애물, 모든 활성 구슬, 순위 텍스트, 미니맵 viewport 사각형이 각각 호출되는지 검증한다. 픽셀 스냅샷은 사용하지 않는다.

- [ ] **Step 4: renderer를 구현한다**

devicePixelRatio를 반영해 backing store를 조정하고 CSS 크기는 컨테이너에 맞춘다. 본 화면에는 카메라 transform을 적용하고 미니맵에는 전체 코스를 고정 비율로 축소한다. participantId가 같은 구슬은 같은 색을 사용하되 구슬 ID는 독립적으로 렌더링한다.

- [ ] **Step 5: 렌더러 검사를 실행한다**

Run: `npm test -- src/features/marble/engine/Camera.test.ts src/features/marble/engine/CanvasRenderer.test.ts && npm run typecheck`
Expected: PASS.

- [ ] **Step 6: 커밋한다**

```bash
git add src/features/marble/engine
git commit -m "룰렛 카메라와 미니맵 렌더링 추가"
```

### Task 7: 설정과 레이스 React 화면

**Files:**
- Create: `src/features/marble/MarbleSetup.tsx`
- Create: `src/features/marble/MarbleSetup.test.tsx`
- Create: `src/features/marble/MarbleRace.tsx`
- Create: `src/features/marble/MarbleRace.test.tsx`
- Create: `src/features/marble/marble.css`

**Interfaces:**
- Consumes: config functions, `RouletteEngine`, `CanvasRenderer`
- Produces: `MarbleSetup`; `MarbleRace({ config, onFinish, onAbort, onError })`

- [ ] **Step 1: 동적 참가자와 총합 검증 테스트를 작성한다**

두 참가자를 기본 표시하고 `참가자 추가`, 삭제, 이름, `구슬 감소/증가`, 첫 번째·마지막 segment, 스킬 switch를 테스트한다. 총합 101에서는 시작 버튼이 비활성화되고 `1개 줄여 주세요`가 표시되어야 한다.

Run: `npm test -- src/features/marble/MarbleSetup.test.tsx`
Expected: FAIL because setup does not exist.

- [ ] **Step 2: 설정 화면을 구현한다**

```ts
export type MarbleGameConfig = {
  participants: MarbleParticipant[];
  winnerMode: 'first' | 'last';
  skillsEnabled: boolean;
  shuffledMarbles: MarbleSeed[];
};
```

참가자나 count가 바뀌면 `expandMarbles` 후 새 순서를 만든다. `섞기`는 동일 config에서 `shuffleMarbles`만 다시 호출한다. 시작은 검증 성공 시 현재 shuffledMarbles를 그대로 전달한다.

- [ ] **Step 3: 포인터 배속 수명 테스트를 작성한다**

Canvas의 `pointerdown`은 `setFastForward(true)`, `pointerup`, `pointercancel`, `lostpointercapture`, component unmount는 모두 `setFastForward(false)`를 호출하는지 테스트한다.

Run: `npm test -- src/features/marble/MarbleRace.test.tsx`
Expected: FAIL because race component does not exist.

- [ ] **Step 4: 레이스 Canvas 수명을 구현한다**

mount에서 엔진과 renderer를 한 번 만들고 초기화가 끝난 뒤 `requestAnimationFrame` loop를 시작한다. unmount에서 frame을 취소하고 엔진을 destroy한다. 포인터 시작 시 capture하고 모든 종료 경로에서 배속을 해제한다. 설정 UI는 레이스 시작과 함께 제거한다.

- [ ] **Step 5: 화면 테스트를 실행한다**

Run: `npm test -- src/features/marble/MarbleSetup.test.tsx src/features/marble/MarbleRace.test.tsx && npm run typecheck`
Expected: PASS.

- [ ] **Step 6: 커밋한다**

```bash
git add src/features/marble
git commit -m "룰렛 설정과 레이스 화면 구현"
```

### Task 8: 페이지 상태·결과·복구

**Files:**
- Create: `src/features/marble/MarblePage.tsx`
- Create: `src/features/marble/MarblePage.test.tsx`
- Modify: `src/app/App.tsx`

**Interfaces:**
- Consumes: `GameShell`, `MarbleSetup`, `MarbleRace`, draft storage
- Produces: `MarblePage()` mounted at `/marble`

- [ ] **Step 1: 설정부터 결과까지 실패 테스트를 작성한다**

fake `MarbleRace`가 finish snapshot을 반환하도록 mock하고 첫 번째 모드에서 당첨 구슬·참가자와 전체 도착 순위를 표시하는지 테스트한다. 홈 확인과 초기화가 `notme:draft:marble`을 제거하는지도 테스트한다.

Run: `npm test -- src/features/marble/MarblePage.test.tsx`
Expected: FAIL because page does not exist.

- [ ] **Step 2: 페이지 상태를 구현한다**

```ts
type MarbleDraft = {
  phase: 'setup' | 'result';
  config: MarbleGameConfig;
  finishOrder: FinishedMarble[];
};
```

레이스 진행 중 Box2D 상태는 직렬화하지 않는다. 레이스 도중 새로고침하면 같은 config의 설정 화면으로 복구하고 `진행 중이던 레이스는 다시 시작해 주세요`를 표시한다. 결과는 구슬 순위마다 참가자 이름을 표시하고 선택 구슬을 강조한다.

- [ ] **Step 3: 라우팅과 오류 화면을 연결한다**

`/marble` placeholder를 교체한다. WASM이나 코스 초기화 실패 시 `룰렛을 불러오지 못했어요`, `다시 시도`, `홈으로`를 표시하고 빈 Canvas를 시작하지 않는다.

- [ ] **Step 4: 전체 룰렛 검사를 실행한다**

Run: `npm test -- src/features/marble src/shared src/app && npm run typecheck && npm run build`
Expected: PASS.

- [ ] **Step 5: 커밋한다**

```bash
git add src/app/App.tsx src/features/marble
git commit -m "마블 룰렛 게임 완성"
```
