# Marble Reference Hybrid Course Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 원형 핀 격자 중심의 단조로운 마블 코스를 사각 범퍼·분산 회전봉·좁은 결승 게이트가 있는 참고형 혼합 코스로 교체한다.

**Architecture:** 기존 데이터 기반 코스 구조에 정적 `box` 장애물 한 종류만 추가한다. `course.ts`가 모든 좌표와 유효성 규칙을 소유하고, `Box2dPhysics`는 같은 형상을 정적 polygon으로 만들며, `CanvasRenderer`는 같은 회전각으로 그린다. 기존 스킬·카메라·순위·다시하기 흐름은 변경하지 않는다.

**Tech Stack:** React 19, TypeScript, Vite, Vitest, Canvas 2D, box2d-wasm

**Spec:** `docs/superpowers/specs/2026-09-11-marble-reference-hybrid-course-design.md`

## Global Constraints

- 반드시 기존 5구간 순서와 단일 맵 구조를 유지한다.
- 큰 다이아몬드, 원형 핀 격자, 긴 `ㅅ` 형 장애물을 다시 넣지 않는다.
- 코스 정적 데이터 외의 UI와 게임 규칙은 건드리지 않는다.
- 검증은 타겟 테스트 RED/GREEN, 대표 고정 시드 100구슬 1회, 전체 단위 테스트 1회, 빌드 1회, 390×844 레이스 1회로 제한한다.
- `repeat-each`, 복수 브라우저·뷰포트, 다중 물리 시드, 전체 E2E, 성능 반복 측정은 실행하지 않는다.
- 실제 완주 실패, 프레임 정지, 간헐 실패가 관찰된 경우에만 이유를 먼저 기록하고 관련 검증을 한 번 추가한다.

---

### Task 1: 정적 사각 범퍼의 타입·유효성 검사·물리 형상 추가

**Files:**
- Modify: `src/features/marble/engine/types.ts`
- Modify: `src/features/marble/engine/course.ts`
- Modify: `src/features/marble/engine/course.test.ts`
- Modify: `src/features/marble/engine/Box2dPhysics.ts`
- Modify: `src/features/marble/engine/Box2dPhysics.test.ts`

- [ ] **Step 1: box validator와 물리 충돌을 요구하는 실패 테스트를 작성한다**

`course.test.ts`에 유효한 box와 크기·각도·반발력·회전 외곽이 잘못된 box 사례를 추가한다.

```ts
const validBox = {
  kind: 'box' as const,
  center: { x: 13, y: 40 },
  width: 2,
  height: 0.4,
  angle: Math.PI / 4,
  restitution: 0.75,
};

it('회전한 box의 실제 외곽과 반발력을 검증한다', () => {
  const valid = structuredClone(NOTME_COURSE);
  valid.sections[1].obstacles.push(validBox);
  expect(validateCourse(valid)).toEqual([]);

  for (const mutate of [
    (box: typeof validBox) => { box.width = 0; },
    (box: typeof validBox) => { box.angle = Number.NaN; },
    (box: typeof validBox) => { box.restitution = 1.1; },
    (box: typeof validBox) => { box.center.x = 0.1; },
  ]) {
    const invalid = structuredClone(valid);
    const box = invalid.sections[1].obstacles.at(-1);
    if (!box || box.kind !== 'box') throw new Error('box 장애물이 필요합니다.');
    mutate(box);
    expect(validateCourse(invalid)).toEqual(expect.arrayContaining([
      expect.stringContaining('사각 장애물'),
    ]));
  }
});
```

`Box2dPhysics.test.ts`에 수평 box가 낙하하는 구슬을 실제로 막는지 확인한다.

```ts
it('정적 box 범퍼가 낙하하는 구슬을 막는다', () => {
  physics.createCourse({
    ...testCourse,
    sections: [{
      kind: 'pins',
      obstacles: [{
        kind: 'box', center: { x: 5, y: 3 }, width: 8, height: 0.5,
        angle: 0, restitution: 0,
      }],
    }],
  });
  physics.createMarble({ id: 'box-marble', x: 5, y: 1 });
  for (let index = 0; index < 120; index += 1) physics.step(1 / 60);
  expect(physics.getMarble('box-marble')!.y).toBeLessThan(3);
});
```

- [ ] **Step 2: 타겟 테스트를 한 번 실행해 RED를 확인한다**

Run: `npm test -- src/features/marble/engine/course.test.ts src/features/marble/engine/Box2dPhysics.test.ts`

Expected: `box`가 `CourseObstacle`에 없고 물리 형상이 생성되지 않아 실패.

- [ ] **Step 3: `BoxObstacle`과 회전 외곽 validator를 추가한다**

`types.ts`:

```ts
export interface BoxObstacle {
  kind: 'box';
  center: CoursePoint;
  width: number;
  height: number;
  angle: number;
  restitution: number;
}

export type CourseObstacle = LineObstacle | CircleObstacle | BoxObstacle | SpinnerObstacle;
```

`course.ts`의 `validateObstacle` 중 `spinner` 처리 앞에 box 분기를 둔다.

```ts
if (obstacle.kind === 'box') {
  const halfWidth = obstacle.width / 2;
  const halfHeight = obstacle.height / 2;
  const extentX = Math.abs(Math.cos(obstacle.angle)) * halfWidth
    + Math.abs(Math.sin(obstacle.angle)) * halfHeight;
  const extentY = Math.abs(Math.sin(obstacle.angle)) * halfWidth
    + Math.abs(Math.cos(obstacle.angle)) * halfHeight;
  const valid = isPositiveNumber(obstacle.width)
    && isPositiveNumber(obstacle.height)
    && Number.isFinite(obstacle.angle)
    && Number.isFinite(obstacle.restitution)
    && obstacle.restitution >= 0
    && obstacle.restitution <= 1
    && obstacle.center.x - extentX >= 0
    && obstacle.center.x + extentX <= course.width
    && obstacle.center.y - extentY >= 0
    && obstacle.center.y + extentY <= course.goalY;
  if (!valid) errors.push('사각 장애물은 회전 외곽과 반발력을 포함해 유효해야 합니다.');
  return;
}
```

- [ ] **Step 4: Box2D 정적 polygon body를 추가한다**

```ts
case 'box':
  this.createBox(obstacle);
  return;
```

```ts
private createBox(obstacle: Extract<CourseObstacle, { kind: 'box' }>): void {
  const { box2d, world } = this.requireWorld();
  const bodyDefinition = new box2d.b2BodyDef();
  const shape = new box2d.b2PolygonShape();
  const fixtureDefinition = new box2d.b2FixtureDef();
  const position = new box2d.b2Vec2(obstacle.center.x, obstacle.center.y);

  bodyDefinition.set_position(position);
  bodyDefinition.set_angle(obstacle.angle);
  shape.SetAsBox(obstacle.width / 2, obstacle.height / 2);
  fixtureDefinition.set_shape(shape);
  fixtureDefinition.set_restitution(obstacle.restitution);

  const body = world.CreateBody(bodyDefinition);
  const fixture = body.CreateFixture(fixtureDefinition);
  this.courseBodies.push(body);
  box2d.LeakMitigator.freeFromCache(fixture);
  box2d.destroy(position);
  box2d.destroy(fixtureDefinition);
  box2d.destroy(shape);
  box2d.destroy(bodyDefinition);
}
```

- [ ] **Step 5: 같은 타겟 테스트를 한 번 실행해 GREEN을 확인한다**

Run: `npm test -- src/features/marble/engine/course.test.ts src/features/marble/engine/Box2dPhysics.test.ts`

Expected: 두 파일의 테스트 통과.

- [ ] **Step 6: 작은 단위로 커밋한다**

```bash
git add src/features/marble/engine/types.ts src/features/marble/engine/course.ts src/features/marble/engine/course.test.ts src/features/marble/engine/Box2dPhysics.ts src/features/marble/engine/Box2dPhysics.test.ts
git commit -m "정적 사각 범퍼 물리 형상 추가"
```

---

### Task 2: 회전한 사각 범퍼를 Canvas와 미니맵에 표시

**Files:**
- Modify: `src/features/marble/engine/CanvasRenderer.ts`
- Modify: `src/features/marble/engine/CanvasRenderer.test.ts`

- [ ] **Step 1: 기본색·accent색 box 렌더 실패 테스트를 작성한다**

`CanvasRenderer.test.ts`의 기록 context에 `strokeRect`의 당시 색을 저장하는 배열을 추가하고, 두 box를 실제 course 장애물로 넣는다.

```ts
it('회전 box를 반발력에 따라 코스색과 accent색으로 그린다', () => {
  const course = structuredClone(NOTME_COURSE);
  course.sections[1].obstacles.push(
    { kind: 'box', center: { x: 8, y: 40 }, width: 2, height: 0.4, angle: 0.25, restitution: 0 },
    { kind: 'box', center: { x: 18, y: 40 }, width: 1, height: 1, angle: Math.PI / 4, restitution: 0.8 },
  );
  const main = createContext(260, 240);
  const minimap = createContext(104, 240);

  new CanvasRenderer(course, []).render(
    { main: main.context, minimap: minimap.context }, createSnapshot(), cameraView,
  );

  expect(main.translate.mock.calls).toContainEqual([8, 40]);
  expect(main.translate.mock.calls).toContainEqual([18, 40]);
  expect(main.rotate.mock.calls).toEqual(expect.arrayContaining([[0.25], [Math.PI / 4]]));
  expect(main.strokeRects).toEqual(expect.arrayContaining([
    { rect: [-1, -0.2, 2, 0.4], style: '#efd5ae' },
    { rect: [-0.5, -0.5, 1, 1], style: '#ef8d6f' },
  ]));
});
```

`createContext` 목은 기존 `strokeRect` 호출 확인을 유지하면서 색까지 기록한다.

```ts
const strokeRects: Array<{ rect: [number, number, number, number]; style: string }> = [];
const strokeRect = vi.fn((...rect: [number, number, number, number]) => {
  strokeRects.push({ rect, style: String(partial.strokeStyle) });
});
```

`RecordedContext`에 `strokeRects: Array<{ rect: [number, number, number, number]; style: string }>`를 추가하고 `createContext`의 반환 객체에 `strokeRects`를 추가한다.

- [ ] **Step 2: 렌더 타겟 테스트를 한 번 실행해 RED를 확인한다**

Run: `npm test -- src/features/marble/engine/CanvasRenderer.test.ts`

Expected: box에 대한 `translate`, `rotate`, `strokeRect`가 호출되지 않아 실패.

- [ ] **Step 3: 반발력에 따라 색을 선택하는 box 렌더를 추가한다**

`CanvasRenderer.ts`에 `BoxObstacle`를 import하고 정적 코스 루프에 box 분기를 추가한다.

```ts
if (obstacle.kind === 'box') drawBox(context, obstacle);
```

```ts
function drawBox(context: CanvasRenderingContext2D, box: BoxObstacle): void {
  context.save();
  context.translate(box.center.x, box.center.y);
  context.rotate(box.angle);
  context.strokeStyle = box.restitution >= 0.5 ? COLORS.accent : COLORS.course;
  context.strokeRect(-box.width / 2, -box.height / 2, box.width, box.height);
  context.restore();
}
```

box 이후의 line·circle이 선택한 색을 상속하지 않도록 `drawStaticCourse` 루프의 기본 `strokeStyle`은 매 일반 형상 전에 course색으로 복구한다.

- [ ] **Step 4: 렌더 타겟 테스트를 한 번 실행해 GREEN을 확인한다**

Run: `npm test -- src/features/marble/engine/CanvasRenderer.test.ts`

Expected: 테스트 통과.

- [ ] **Step 5: 커밋한다**

```bash
git add src/features/marble/engine/CanvasRenderer.ts src/features/marble/engine/CanvasRenderer.test.ts
git commit -m "마블 코스 사각 범퍼 표시"
```

---

### Task 3: 코스 데이터를 참고형 혼합 구조로 교체

**Files:**
- Modify: `src/features/marble/engine/course.ts`
- Modify: `src/features/marble/engine/course.test.ts`
- Modify if a literal depends on the changed obstacle: `src/features/marble/engine/CanvasRenderer.test.ts`

- [ ] **Step 1: 새 코스의 구조적 성공 조건을 먼저 테스트로 고정한다**

`course.test.ts`의 기존 `촘촘한 핀...` 테스트와 긴 깔때기 기대값을 다음 구조로 교체한다.

```ts
type Box = Extract<CourseObstacle, { kind: 'box' }>;

it('사각 범퍼와 높이별 회전봉이 혼합된 코스다', () => {
  const obstacles = NOTME_COURSE.sections.flatMap(({ obstacles }) => obstacles);
  const circles = obstacles.filter(({ kind }) => kind === 'circle');
  const boxes = obstacles.filter((obstacle): obstacle is Box => obstacle.kind === 'box');
  const spinners = obstacles.filter(isSpinner);
  const row = spinners.filter(({ id }) => id.startsWith('spinner:row-'));

  expect(circles.length).toBeLessThanOrEqual(5);
  expect(boxes.length).toBeGreaterThanOrEqual(18);
  expect(boxes.some(({ restitution }) => restitution >= 0.7)).toBe(true);
  expect(spinners).toHaveLength(10);
  expect(spinners.filter(({ center }) => center.y < 30)).toHaveLength(2);
  expect(row).toHaveLength(5);
  expect(new Set(row.map(({ center }) => center.y))).toEqual(new Set([68]));
  expect(spinners.filter(({ center }) => center.y > 76 && center.y < 112)).toHaveLength(2);
});
```

```ts
it('짧고 완만한 깔때기와 입구를 가로막는 긴 게이트를 갖는다', () => {
  const finish = NOTME_COURSE.sections.find(({ kind }) => kind === 'finish');
  if (!finish) throw new Error('결승 구간이 필요합니다.');
  const lines = finish.obstacles.filter(isLine);
  const gate = finish.obstacles.find(
    (obstacle): obstacle is Spinner => obstacle.kind === 'spinner'
      && obstacle.id === 'spinner:finish-gate',
  );
  if (!gate) throw new Error('결승 게이트가 필요합니다.');

  const goalWidth = Math.abs(NOTME_COURSE.goalSensor.to.x - NOTME_COURSE.goalSensor.from.x);
  const funnel = lines.filter(({ from, to }) => Math.min(from.y, to.y) === 119);
  const funnelAngles = funnel.map(({ from, to }) => (
    Math.atan2(Math.abs(to.y - from.y), Math.abs(to.x - from.x)) * 180 / Math.PI
  ));

  expect(goalWidth).toBeCloseTo(1.2, 5);
  expect(funnel).toHaveLength(2);
  for (const angle of funnelAngles) {
    expect(angle).toBeGreaterThanOrEqual(45);
    expect(angle).toBeLessThanOrEqual(50);
  }
  expect(gate).toMatchObject({
    center: { x: 11.75, y: 125.2 },
    length: 5.5,
    angle: 0,
    angularVelocity: -1.2,
  });
  expect(gate.length).toBeGreaterThan(goalWidth * 4);
});
```

- [ ] **Step 2: 코스 타겟 테스트를 한 번 실행해 RED를 확인한다**

Run: `npm test -- src/features/marble/engine/course.test.ts`

Expected: 기존 핀 개수, 회전봉 분포, 결승 입구 수치가 달라 실패.

- [ ] **Step 3: 상단과 사각 범퍼 구간을 교체한다**

다음 배치를 `ramps`, `pins`에 적용한다.

```ts
// ramps: 중앙 자유낙하를 끊는 경사면 + 분산 회전봉 2개
{ kind: 'line', from: { x: 2, y: 8 }, to: { x: 15, y: 13 } },
{ kind: 'line', from: { x: 24, y: 18 }, to: { x: 11, y: 24 } },
{ kind: 'spinner', id: 'spinner:upper-left', center: { x: 6.5, y: 18 }, length: 6, angle: 0.2, angularVelocity: 2.2 },
{ kind: 'spinner', id: 'spinner:upper-right', center: { x: 19, y: 29 }, length: 5.5, angle: -0.5, angularVelocity: -1.8 },
```

`pins`에는 다음 19개 box와 3개 circle만 배치한다. `B` helper는 아래와 같이 해당 파일에만 둔다.

```ts
const B = (
  x: number, y: number, width: number, height: number,
  angle: number, restitution = 0.15,
): BoxObstacle => ({ kind: 'box', center: { x, y }, width, height, angle, restitution });

// y 35~56: 마름모와 짧은 판을 교차해 배치
B(3.0, 35, 1.0, 1.0, Math.PI / 4, 0.8),
B(7.5, 36, 2.0, 0.35, -0.35),
B(12.5, 34.5, 1.0, 1.0, Math.PI / 4, 0.2),
B(17.0, 36.5, 2.2, 0.35, 0.3),
B(22.5, 35, 1.0, 1.0, Math.PI / 4, 0.8),
B(5.0, 42, 2.2, 0.35, 0.35),
B(9.5, 43, 1.0, 1.0, Math.PI / 4, 0.75),
B(14.5, 42, 2.0, 0.35, -0.3),
B(19.5, 43.5, 1.0, 1.0, Math.PI / 4, 0.2),
B(23.0, 42, 1.8, 0.35, -0.4),
B(2.5, 49, 1.0, 1.0, Math.PI / 4, 0.75),
B(7.0, 50, 2.4, 0.35, -0.3),
B(12.0, 49, 1.0, 1.0, Math.PI / 4, 0.2),
B(17.0, 50.5, 2.2, 0.35, 0.35),
B(22.5, 49, 1.0, 1.0, Math.PI / 4, 0.75),
B(5.0, 56, 2.6, 0.35, 0.25),
B(10.5, 56.5, 1.0, 1.0, Math.PI / 4, 0.2),
B(16.0, 55.5, 2.6, 0.35, -0.25),
B(21.5, 56.5, 1.0, 1.0, Math.PI / 4, 0.8),
{ kind: 'circle', center: { x: 13, y: 39 }, radius: 0.35 },
{ kind: 'circle', center: { x: 4, y: 54 }, radius: 0.35 },
{ kind: 'circle', center: { x: 23, y: 54 }, radius: 0.35 },
```

- [ ] **Step 4: 가로 회전봉과 하단 혼합 구간을 교체한다**

`spinner` 구간은 y=68의 5개로 고정한다.

```ts
{ kind: 'spinner', id: 'spinner:row-1', center: { x: 3, y: 68 }, length: 3.2, angle: 0, angularVelocity: 3.5 },
{ kind: 'spinner', id: 'spinner:row-2', center: { x: 8, y: 68 }, length: 3.2, angle: 0, angularVelocity: -3.5 },
{ kind: 'spinner', id: 'spinner:row-3', center: { x: 13, y: 68 }, length: 3.2, angle: 0, angularVelocity: 3.5 },
{ kind: 'spinner', id: 'spinner:row-4', center: { x: 18, y: 68 }, length: 3.2, angle: 0, angularVelocity: -3.5 },
{ kind: 'spinner', id: 'spinner:row-5', center: { x: 23, y: 68 }, length: 3.2, angle: 0, angularVelocity: 3.5 },
```

`fork` 구간은 하단 회전봉 2개와 교차 지지물로 구성한다.

```ts
{ kind: 'spinner', id: 'spinner:lower-left', center: { x: 7, y: 83 }, length: 6.5, angle: Math.PI / 6, angularVelocity: 2 },
B(16, 80, 2.2, 0.35, -0.3, 0.2),
B(22, 87, 1.0, 1.0, Math.PI / 4, 0.75),
{ kind: 'line', from: { x: 2, y: 90 }, to: { x: 7, y: 94 } },
B(12.5, 95, 2.4, 0.35, 0.25, 0.2),
{ kind: 'spinner', id: 'spinner:lower-right', center: { x: 19, y: 99 }, length: 7, angle: -Math.PI / 5, angularVelocity: -1.7 },
B(4, 103, 1.0, 1.0, Math.PI / 4, 0.8),
B(11, 107, 2.2, 0.35, -0.3, 0.2),
B(21, 108, 1.0, 1.0, Math.PI / 4, 0.75),
```

- [ ] **Step 5: 짧은 깔때기·좁은 통로·긴 게이트로 결승 구간을 교체한다**

```ts
{ kind: 'line', from: { x: 0, y: 108 }, to: { x: 6.5, y: 116 } },
{ kind: 'line', from: { x: 26, y: 108 }, to: { x: 19.5, y: 116 } },
{ kind: 'line', from: { x: 6.5, y: 116 }, to: { x: 6.5, y: 119 } },
{ kind: 'line', from: { x: 19.5, y: 116 }, to: { x: 19.5, y: 119 } },
{ kind: 'line', from: { x: 6.5, y: 119 }, to: { x: 12.4, y: 126 } },
{ kind: 'line', from: { x: 19.5, y: 119 }, to: { x: 13.6, y: 126 } },
{
  kind: 'spinner', id: 'spinner:finish-gate',
  center: { x: 11.75, y: 125.2 }, length: 5.5,
  angle: 0, angularVelocity: -1.2,
},
{ kind: 'line', from: { x: 12.4, y: 126 }, to: { x: 12.4, y: 135 } },
{ kind: 'line', from: { x: 13.6, y: 126 }, to: { x: 13.6, y: 135 } },
```

`goalSensor` 좌표는 `{ x: 12.4, y: 135 }`에서 `{ x: 13.6, y: 135 }`로 고정한다. 게이트의 초기 수평 선분이 입구를 전체로 가로지르고, 회전 중심이 왼쪽이므로 수직에 가까워질 때 오른쪽 틈이 열린다.

- [ ] **Step 6: 코스 타겟 테스트를 한 번 실행해 GREEN을 확인한다**

Run: `npm test -- src/features/marble/engine/course.test.ts`

Expected: 코스 구조와 경계 validator 테스트 통과.

- [ ] **Step 7: 커밋한다**

```bash
git add src/features/marble/engine/course.ts src/features/marble/engine/course.test.ts src/features/marble/engine/CanvasRenderer.test.ts
git commit -m "참고형 혼합 마블 코스로 재구성"
```

---

### Task 4: 대표 100구슬 완주 검증을 1회로 정리

**Files:**
- Modify: `src/features/marble/engine/RouletteEngine.integration.test.ts`

- [ ] **Step 1: 반복 시드·스킬 조합을 대표 시드 1회로 줄인다**

코스 완주와 스킬 동작은 별도 단위 테스트가 담당하므로, 이 통합 테스트는 스킬을 끄고 고정 시드 1만 사용한다.

```ts
it('실제 100구슬이 대표 시드에서 120초 안에 유효하게 완주한다', async () => {
  const result = await runHundredMarbles(1, false);
  expect(result.finishOrder).toHaveLength(100);
  expect(result.simulatedMs).toBeLessThanOrEqual(120_000);
  expect(result.skillActivationCount).toBe(0);
}, 10_000);
```

`it.each([1, 2, 3, 4, 5])`, `for (skillsEnabled ...)`, 동일 시드 재실행 블록은 제거한다. 시작 중앙 3구슬 테스트는 그대로 유지한다.

- [ ] **Step 2: 대표 100구슬 완주를 단 한 번 실행한다**

Run: `npm test -- src/features/marble/engine/RouletteEngine.integration.test.ts`

Expected: 100개 전부 좁은 입구와 결승 센서를 통과하고 탈출 없이 통과.

이 한 번의 실행에서만 실패한다면, 추가 시드를 돌리지 말고 정체한 y 구간을 출력하는 진단을 1회 추가한 뒤 해당 좌표만 조정한다.

- [ ] **Step 3: 커밋한다**

```bash
git add src/features/marble/engine/RouletteEngine.integration.test.ts
git commit -m "혼합 코스 완주 검증 범위 정리"
```

---

### Task 5: 최소 종합 검증과 모바일 1회 확인

**Files:**
- Modify only if a concrete failure is found: files directly responsible for that failure
- Do not add committed screenshots or temporary browser scripts

- [ ] **Step 1: 전체 단위 테스트를 단 한 번 실행한다**

Run: `npm test`

Expected: 전체 통과. 성공하면 동일 명령을 다시 실행하지 않는다.

- [ ] **Step 2: TypeScript와 production bundle을 단 한 번 검증한다**

Run: `npm run build`

Expected: `tsc -b` 및 `vite build` 성공. 성공하면 동일 명령을 다시 실행하지 않는다.

- [ ] **Step 3: 390×844 모바일에서 레이스를 단 한 번 진행한다**

Run: `npm run dev -- --host 127.0.0.1`

단 한 레이스에서 다음 세 지점만 확인하고, 각 지점에 대한 중복 캡처를 만들지 않는다.

1. 상단·사각 범퍼 구간: 구슬이 자유낙하하지 않고 마름모에서 좌우로 튀어 나간다.
2. 가로·하단 회전봉 구간: 회전봉이 y=68 한 줄 외에도 보이고 구슬이 잠시 막히거나 위로 튀어 오른다.
3. 결승 구간: 깔때기가 짧고 완만하며, 길이 5.5 게이트가 평소 폭 1.2 입구를 가로막아 일시 정체를 만든다.

기존 미니맵에서도 이 세 구간의 형상이 구분되는지 같은 레이스 중에 확인한다.

- [ ] **Step 4: 최종 diff를 한 번 검토하고 작업 범위만 커밋한다**

Run: `git diff --check && git status --short`

Expected: whitespace 오류 없음, 계획·사각 범퍼·코스·관련 테스트 변경만 표시.

구체적 실패로 추가 수정한 파일이 있을 때만, 아래 명령에서 실제로 변경된 파일만 스테이징한 뒤 커밋한다.

```bash
git add src/features/marble/engine/course.ts src/features/marble/engine/course.test.ts src/features/marble/engine/Box2dPhysics.ts src/features/marble/engine/Box2dPhysics.test.ts src/features/marble/engine/CanvasRenderer.ts src/features/marble/engine/CanvasRenderer.test.ts src/features/marble/engine/RouletteEngine.integration.test.ts
git commit -m "마블 혼합 코스 검증 보완"
```

---

## Completion Checklist

- [ ] `CourseObstacle`가 `box`를 포함하고 유효성 검사·Box2D·Canvas가 동일한 좌표계를 사용한다.
- [ ] 새 코스의 circle은 5개 이하, box는 18개 이상, spinner는 상단 2 + 가로 5 + 하단 2 + 결승 1이다.
- [ ] 결승 입구는 폭 1.2, 깔때기는 45~50도, 게이트는 길이 5.5이며 초기 상태에서 입구를 가로지른다.
- [ ] 고정 시드 1의 100구슬이 탈출·영구 정체 없이 완주한다.
- [ ] 전체 단위 테스트 1회와 production build 1회가 통과한다.
- [ ] 390×844 레이스 1회에서 구간별 상호작용과 미니맵 구분을 확인한다.
- [ ] 스킬·카메라·순위·다시하기·PWA 코드에 요청 외 변경이 없다.
