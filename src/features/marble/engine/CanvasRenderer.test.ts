import { afterEach, describe, expect, it, vi } from 'vitest';

import { Camera, type CameraView } from './Camera';
import { CanvasRenderer } from './CanvasRenderer';
import { NOTME_COURSE } from './course';
import type { ActiveMarble, RaceSnapshot } from './RouletteEngine';

type ArcCall = [x: number, y: number, radius: number, start: number, end: number];

type RecordedContext = {
  context: CanvasRenderingContext2D;
  canvas: HTMLCanvasElement;
  widthWrites: () => number;
  heightWrites: () => number;
  arcs: ArcCall[];
  fills: Array<{ arc: ArcCall | null; style: string }>;
  strokes: Array<{ arc: ArcCall | null; style: string; lineWidth: number; globalAlpha: number }>;
  fillTexts: Array<[text: string, x: number, y: number, maxWidth?: number]>;
  strokeTexts: Array<{ text: string; font: string; style: string; lineWidth: number }>;
  setTransform: ReturnType<typeof vi.fn>;
  translate: ReturnType<typeof vi.fn>;
  scale: ReturnType<typeof vi.fn>;
  rotate: ReturnType<typeof vi.fn>;
  moveTo: ReturnType<typeof vi.fn>;
  lineTo: ReturnType<typeof vi.fn>;
  strokeRect: ReturnType<typeof vi.fn>;
  strokeRects: Array<{ rect: [number, number, number, number]; style: string }>;
};

function createContext(
  width: number,
  height: number,
): RecordedContext {
  let backingWidth = 300;
  let backingHeight = 150;
  let widthWriteCount = 0;
  let heightWriteCount = 0;
  let lastArc: ArcCall | null = null;
  const arcs: ArcCall[] = [];
  const fills: Array<{ arc: ArcCall | null; style: string }> = [];
  const strokes: RecordedContext['strokes'] = [];
  const fillTexts: Array<[string, number, number, number?]> = [];
  const strokeTexts: RecordedContext['strokeTexts'] = [];
  const canvas = {
    get width() { return backingWidth; },
    set width(value: number) { backingWidth = value; widthWriteCount += 1; },
    get height() { return backingHeight; },
    set height(value: number) { backingHeight = value; heightWriteCount += 1; },
    clientWidth: width,
    clientHeight: height,
    style: { width: `${width}px`, height: `${height}px` },
    getBoundingClientRect: () => ({ width, height }),
  } as unknown as HTMLCanvasElement;
  const setTransform = vi.fn();
  const translate = vi.fn();
  const scale = vi.fn();
  const rotate = vi.fn();
  const moveTo = vi.fn();
  const lineTo = vi.fn();
  const strokeRects: RecordedContext['strokeRects'] = [];
  const strokeRect = vi.fn((...rect: [number, number, number, number]) => {
    strokeRects.push({ rect, style: String(partial.strokeStyle) });
  });
  const partial = {
    canvas,
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    globalAlpha: 1,
    font: '',
    textAlign: 'start',
    textBaseline: 'alphabetic',
    setTransform,
    clearRect: vi.fn(),
    fillRect: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    translate,
    scale,
    rotate,
    beginPath: vi.fn(() => { lastArc = null; }),
    closePath: vi.fn(),
    moveTo,
    lineTo,
    stroke: vi.fn(() => {
      strokes.push({
        arc: lastArc,
        style: String(partial.strokeStyle),
        lineWidth: partial.lineWidth,
        globalAlpha: partial.globalAlpha,
      });
    }),
    arc: vi.fn((...call: ArcCall) => {
      lastArc = call;
      arcs.push(call);
    }),
    fill: vi.fn(() => {
      fills.push({ arc: lastArc, style: String(partial.fillStyle) });
    }),
    strokeRect,
    fillText: vi.fn((text: string, x: number, y: number, maxWidth?: number) => {
      fillTexts.push([text, x, y, maxWidth]);
    }),
    strokeText: (text: string) => {
      strokeTexts.push({ text, font: partial.font, style: partial.strokeStyle, lineWidth: partial.lineWidth });
    },
  };

  return {
    context: partial as unknown as CanvasRenderingContext2D,
    canvas,
    widthWrites: () => widthWriteCount,
    heightWrites: () => heightWriteCount,
    arcs,
    fills,
    strokes,
    fillTexts,
    strokeTexts,
    setTransform,
    translate,
    scale,
    rotate,
    moveTo,
    lineTo,
    strokeRect,
    strokeRects,
  };
}

function createActive(
  id: string,
  participantId: string,
  name: string,
  x: number,
  y: number,
): ActiveMarble {
  return {
    id,
    participantId,
    name,
    body: { id, x, y, angle: 0, radius: 0.25 },
  };
}

function createSnapshot(overrides: Partial<RaceSnapshot> = {}): RaceSnapshot {
  return {
    active: [],
    dynamicObstacles: [],
    skillEffects: [],
    skillActivationCount: 0,
    finishOrder: [],
    winner: null,
    winnerMode: 'first',
    speed: 1,
    ...overrides,
  };
}

const cameraView: CameraView = {
  leftX: 0,
  width: 26,
  centerY: 42,
  topY: 30,
  height: 24,
  zoom: 1,
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('CanvasRenderer', () => {
  it.each([
    { device: '320×568', width: 288, height: 360 },
    { device: '320×800', width: 288, height: 496 },
    { device: '390×844', width: 358, height: 523.28 },
  ])('$device 세로 화면은 골인 근처에서도 좌우 외벽과 추적 구슬을 모두 보여 준다', ({ width, height }) => {
    const main = createContext(width, height);
    const minimap = createContext(68, 150);
    const camera = new Camera();
    const renderer = new CanvasRenderer(NOTME_COURSE, [
      createActive('a:0', 'a', '짱구', 0, 0), createActive('b:0', 'b', '철수', 0, 0),
    ]);
    for (const y of [1, 60, 119.5]) {
      const snapshot = createSnapshot({ active: [
        createActive('a:0', 'a', '짱구', 0.3, y),
        createActive('b:0', 'b', '철수', 25.7, y),
      ] });
      const view = camera.update(snapshot, NOTME_COURSE, { width, height });
      main.translate.mockClear();
      main.scale.mockClear();
      minimap.strokeRect.mockClear();
      renderer.render({ main: main.context, minimap: minimap.context }, snapshot, view);
      const [offsetX, offsetY] = main.translate.mock.calls[0];
      const [scale] = main.scale.mock.calls[0];
      expect(offsetX).toBeGreaterThanOrEqual(0.5);
      expect(offsetX + 26 * scale).toBeLessThanOrEqual(width - 0.5);
      expect(offsetY + (y - 0.25) * scale).toBeGreaterThanOrEqual(-0.000001);
      expect(offsetY + (y + 0.25) * scale).toBeLessThanOrEqual(height + 0.000001);
      const [left, top, visibleWidth, visibleHeight] = minimap.strokeRect.mock.calls[0];
      expect(left).toBeCloseTo(-offsetX / scale);
      expect(top).toBeCloseTo(-offsetY / scale);
      expect(visibleWidth).toBeCloseTo(width / scale);
      expect(visibleHeight).toBeCloseTo(height / scale);
    }
  });

  it('DPR backing store와 CSS layout 크기를 분리하고 반복 render에서 transform을 초기화한다', () => {
    vi.stubGlobal('devicePixelRatio', 2);
    const main = createContext(260, 240);
    const minimap = createContext(104, 240);
    const renderer = new CanvasRenderer(NOTME_COURSE, []);

    renderer.render({ main: main.context, minimap: minimap.context }, createSnapshot(), cameraView);
    renderer.render({ main: main.context, minimap: minimap.context }, createSnapshot(), cameraView);

    expect([main.canvas.width, main.canvas.height]).toEqual([520, 480]);
    expect([minimap.canvas.width, minimap.canvas.height]).toEqual([208, 480]);
    expect(main.canvas.style.width).toBe('260px');
    expect(main.canvas.style.height).toBe('240px');
    expect(main.widthWrites()).toBe(1);
    expect(main.heightWrites()).toBe(1);
    expect(main.setTransform.mock.calls).toEqual([
      [2, 0, 0, 2, 0, 0],
      [2, 0, 0, 2, 0, 0],
    ]);
  });

  it('외벽·line·circle, snapshot angle 회전체, 활성 구슬을 그리고 Canvas에는 도착 순위를 쓰지 않는다', () => {
    const main = createContext(260, 240);
    const minimap = createContext(104, 240);
    const snapshot = createSnapshot({
      active: [
        createActive('a:0', 'a', '짱구', 4, 40),
        createActive('a:1', 'a', '짱구', 6, 42),
        createActive('b:0', 'b', '철수', 8, 44),
      ],
      dynamicObstacles: [
        { id: 'spinner:crosswind', kind: 'spinner', center: { x: 13, y: 56 }, length: 9, angle: 0.75 },
        { id: 'spinner:counter', kind: 'spinner', center: { x: 13, y: 68 }, length: 11, angle: -0.25 },
      ],
      finishOrder: [{ id: 'a:0', participantId: 'a', name: '짱구', rank: 1 }],
    });

    new CanvasRenderer(NOTME_COURSE, snapshot.active).render(
      { main: main.context, minimap: minimap.context },
      snapshot,
      cameraView,
    );

    expect(main.moveTo.mock.calls).toContainEqual([0, 0]);
    expect(main.lineTo.mock.calls).toContainEqual([0, NOTME_COURSE.goalY]);
    expect(main.arcs).toContainEqual([13, 41, 0.38, 0, Math.PI * 2]);
    expect(main.rotate.mock.calls).toEqual([[0.75], [-0.25]]);

    const marbleFills = main.fills.filter(({ arc }) => arc?.[2] === 0.25);
    expect(marbleFills.map(({ arc }) => arc?.slice(0, 3))).toEqual([
      [4, 40, 0.25],
      [6, 42, 0.25],
      [8, 44, 0.25],
    ]);
    expect(marbleFills[0].style).not.toBe(marbleFills[1].style);
    expect(marbleFills[2].style).not.toBe(marbleFills[0].style);
    expect(main.fillTexts.some(([text]) => text.includes('위') || text.includes('a:0'))).toBe(false);
  });

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

  it('초기 섞기 순서의 색은 다른 구슬이 도착하거나 active 순서가 바뀌어도 유지된다', () => {
    const main = createContext(260, 240);
    const minimap = createContext(104, 240);
    const active = [
      createActive('a:0', 'a', '짱구', 4, 40),
      createActive('a:1', 'a', '짱구', 6, 42),
      createActive('b:0', 'b', '철수', 8, 44),
    ];
    const renderer = new CanvasRenderer(NOTME_COURSE, [active[2], active[0], active[1]]);
    renderer.render({ main: main.context, minimap: minimap.context }, createSnapshot({ active }), cameraView);
    expect(main.fills.map(({ style }) => style)).toEqual([
      'hsl(120 100% 70%)', 'hsl(240 100% 70%)', 'hsl(0 100% 70%)',
    ]);
    main.fills.length = 0;
    minimap.fills.length = 0;
    renderer.render({ main: main.context, minimap: minimap.context }, createSnapshot({ active: [active[2], active[1]] }), cameraView);
    expect(main.fills.map(({ style }) => style)).toEqual(['hsl(0 100% 70%)', 'hsl(240 100% 70%)']);
    expect(minimap.fills.map(({ style }) => style)).toEqual(['hsl(0 100% 70%)', 'hsl(240 100% 70%)']);
  });

  it('미니맵은 26x135 전체를 고정 비율로 fit하고 main camera와 독립적으로 viewport를 그린다', () => {
    const main = createContext(260, 240);
    const minimap = createContext(130, 300);
    const zoomedView: CameraView = { leftX: 6.5, width: 13, centerY: 66, topY: 60, height: 12, zoom: 2 };
    const snapshot = createSnapshot({
      active: [createActive('a:0', 'a', '짱구', 13, 66)],
    });

    new CanvasRenderer(NOTME_COURSE, snapshot.active).render(
      { main: main.context, minimap: minimap.context },
      snapshot,
      zoomedView,
    );

    expect(main.scale.mock.calls).toContainEqual([20, 20]);
    expect(minimap.translate.mock.calls[0][0]).toBeCloseTo(36.11111, 5);
    expect(minimap.translate.mock.calls[0][1]).toBe(0);
    expect(minimap.scale.mock.calls[0][0]).toBeCloseTo(2.22222, 5);
    expect(minimap.scale.mock.calls[0][1]).toBeCloseTo(2.22222, 5);
    expect(minimap.strokeRect.mock.calls).toContainEqual([6.5, 60, 13, 12]);
    expect(minimap.arcs).toContainEqual([13, 66, 0.25, 0, Math.PI * 2]);
  });

  it('250ms 지난 스킬 충격파를 main과 미니맵에 확장·감쇠한 원으로 그린다', () => {
    const main = createContext(260, 240);
    const minimap = createContext(104, 240);
    const snapshot = createSnapshot({
      active: [createActive('a:0', 'a', '짱구', 13, 42)],
      skillEffects: [{
        id: 1,
        center: { x: 13, y: 42 },
        elapsedMs: 250,
        durationMs: 500,
      }],
    });

    new CanvasRenderer(NOTME_COURSE, snapshot.active).render(
      { main: main.context, minimap: minimap.context },
      snapshot,
      cameraView,
    );

    expect(main.strokes.filter(({ style }) => style === '#7dd3fc')).toEqual([{
      arc: [13, 42, 2.75, 0, Math.PI * 2],
      style: '#7dd3fc',
      lineWidth: 0.2,
      globalAlpha: 0.75,
    }]);
    expect(minimap.strokes.filter(({ style }) => style === '#7dd3fc')).toEqual([{
      arc: [13, 42, 2.75, 0, Math.PI * 2],
      style: '#7dd3fc',
      lineWidth: 1.125,
      globalAlpha: 0.75,
    }]);
  });

  it('세로 main 화면과 미니맵에 같은 실제 가시 범위를 표시한다', () => {
    const main = createContext(260, 480);
    const minimap = createContext(130, 300);
    const portraitView = new Camera().update(createSnapshot({
      active: [createActive('a:0', 'a', '짱구', 13, 42)],
    }), NOTME_COURSE, { width: 260, height: 480 });

    new CanvasRenderer(NOTME_COURSE, []).render(
      { main: main.context, minimap: minimap.context },
      createSnapshot(),
      portraitView,
    );

    expect(main.scale.mock.calls[0][0]).toBeCloseTo(260 / 27);
    expect(main.translate.mock.calls[0][0]).toBeGreaterThan(0);
    expect(minimap.strokeRect.mock.calls).toContainEqual([
      portraitView.leftX, portraitView.topY, portraitView.width, portraitView.height,
    ]);
  });

  it.each([1, 2])('zoom %s에서도 긴 전체 이름을 일정한 화면 크기와 어두운 외곽선으로 표시한다', (zoom) => {
    const main = createContext(260, 240);
    const minimap = createContext(104, 240);

    new CanvasRenderer(NOTME_COURSE, [createActive('a:0', 'a', '아주 긴 참가자 이름', 13, 66)]).render(
      { main: main.context, minimap: minimap.context },
      createSnapshot({ active: [createActive('a:0', 'a', '아주 긴 참가자 이름', 13, 66)] }),
      { leftX: 0, width: 26 / zoom, centerY: 66, topY: 60, height: 24 / zoom, zoom },
    );

    expect(main.fillTexts).toEqual([['아주 긴 참가자 이름', 0, -4, undefined]]);
    expect(main.strokeTexts).toEqual([{ text: '아주 긴 참가자 이름', font: '12px sans-serif', style: '#211b18', lineWidth: 3 }]);
    expect(main.scale.mock.calls).toContainEqual([1 / (10 * zoom), 1 / (10 * zoom)]);
    expect(minimap.fillTexts).toEqual([]);
  });

  it('100개 active에서 화면 안의 25개 이름과 몸체만 그리고 미니맵에는 전체를 유지한다', () => {
    const main = createContext(260, 240);
    const minimap = createContext(104, 240);
    const active = Array.from({ length: 100 }, (_, index) => (
      createActive(`a:${index}`, 'a', `참가자 ${index + 1}`, 13, index + 1)
    ));

    new CanvasRenderer(NOTME_COURSE, active).render(
      { main: main.context, minimap: minimap.context },
      createSnapshot({ active }),
      cameraView,
    );

    expect(main.fills.filter(({ arc }) => arc?.[2] === 0.25)).toHaveLength(25);
    expect(main.fillTexts.map(([text]) => text)).toEqual(Array.from({ length: 25 }, (_, index) => `참가자 ${index + 30}`));
    expect(minimap.fills.filter(({ arc }) => arc?.[2] === 0.25)).toHaveLength(100);
    expect(new Set(minimap.fills.map(({ style }) => style)).size).toBe(100);
    expect(minimap.fillTexts).toEqual([]);
  });
});
