import { afterEach, describe, expect, it, vi } from 'vitest';

import type { CameraView } from './Camera';
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
  fillTexts: Array<[text: string, x: number, y: number, maxWidth?: number]>;
  setTransform: ReturnType<typeof vi.fn>;
  translate: ReturnType<typeof vi.fn>;
  scale: ReturnType<typeof vi.fn>;
  rotate: ReturnType<typeof vi.fn>;
  moveTo: ReturnType<typeof vi.fn>;
  lineTo: ReturnType<typeof vi.fn>;
  strokeRect: ReturnType<typeof vi.fn>;
};

function createContext(
  width: number,
  height: number,
  measureWidth: (text: string) => number = (text) => text.length * 6,
): RecordedContext {
  let backingWidth = 300;
  let backingHeight = 150;
  let widthWriteCount = 0;
  let heightWriteCount = 0;
  let lastArc: ArcCall | null = null;
  const arcs: ArcCall[] = [];
  const fills: Array<{ arc: ArcCall | null; style: string }> = [];
  const fillTexts: Array<[string, number, number, number?]> = [];
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
  const strokeRect = vi.fn();
  const partial = {
    canvas,
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
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
    stroke: vi.fn(),
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
    measureText: vi.fn((text: string) => ({ width: measureWidth(text) } as TextMetrics)),
  };

  return {
    context: partial as unknown as CanvasRenderingContext2D,
    canvas,
    widthWrites: () => widthWriteCount,
    heightWrites: () => heightWriteCount,
    arcs,
    fills,
    fillTexts,
    setTransform,
    translate,
    scale,
    rotate,
    moveTo,
    lineTo,
    strokeRect,
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
    finishOrder: [],
    winner: null,
    winnerMode: 'first',
    speed: 1,
    ...overrides,
  };
}

const cameraView: CameraView = {
  centerY: 42,
  topY: 30,
  height: 24,
  zoom: 1,
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('CanvasRenderer', () => {
  it('DPR backing store와 CSS layout 크기를 분리하고 반복 render에서 transform을 초기화한다', () => {
    vi.stubGlobal('devicePixelRatio', 2);
    const main = createContext(260, 240);
    const minimap = createContext(104, 240);
    const renderer = new CanvasRenderer(NOTME_COURSE);

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

  it('외벽·line·circle, snapshot angle 회전체, 활성 구슬, finish rank를 그린다', () => {
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

    new CanvasRenderer(NOTME_COURSE).render(
      { main: main.context, minimap: minimap.context },
      snapshot,
      cameraView,
    );

    expect(main.moveTo.mock.calls).toContainEqual([0, 0]);
    expect(main.lineTo.mock.calls).toContainEqual([0, 120]);
    expect(main.arcs).toContainEqual([13, 47, 1, 0, Math.PI * 2]);
    expect(main.rotate.mock.calls).toEqual([[0.75], [-0.25]]);

    const marbleFills = main.fills.filter(({ arc }) => arc?.[2] === 0.25);
    expect(marbleFills.map(({ arc }) => arc?.slice(0, 3))).toEqual([
      [4, 40, 0.25],
      [6, 42, 0.25],
      [8, 44, 0.25],
    ]);
    expect(marbleFills[0].style).toBe(marbleFills[1].style);
    expect(marbleFills[2].style).not.toBe(marbleFills[0].style);
    expect(main.fillTexts).toContainEqual(['1위 짱구 (a:0)', 12, 20, 236]);
  });

  it('미니맵은 26x120 전체를 고정 비율로 fit하고 main camera와 독립적으로 viewport를 그린다', () => {
    const main = createContext(260, 240);
    const minimap = createContext(130, 300);
    const zoomedView: CameraView = { centerY: 66, topY: 60, height: 12, zoom: 2 };
    const snapshot = createSnapshot({
      active: [createActive('a:0', 'a', '짱구', 13, 66)],
    });

    new CanvasRenderer(NOTME_COURSE).render(
      { main: main.context, minimap: minimap.context },
      snapshot,
      zoomedView,
    );

    expect(main.scale.mock.calls).toContainEqual([20, 20]);
    expect(minimap.translate.mock.calls[0]).toEqual([32.5, 0]);
    expect(minimap.scale.mock.calls).toEqual([[2.5, 2.5]]);
    expect(minimap.strokeRect.mock.calls).toContainEqual([0, 60, 26, 12]);
    expect(minimap.arcs).toContainEqual([13, 66, 0.25, 0, Math.PI * 2]);
  });

  it('측정 폭이 구슬 label 영역보다 큰 긴 이름을 생략한다', () => {
    const main = createContext(260, 240, () => 5);
    const minimap = createContext(104, 240, () => 5);

    new CanvasRenderer(NOTME_COURSE).render(
      { main: main.context, minimap: minimap.context },
      createSnapshot({ active: [createActive('a:0', 'a', '아주 긴 참가자 이름', 13, 66)] }),
      { centerY: 66, topY: 60, height: 12, zoom: 2 },
    );

    expect(main.fillTexts).toEqual([]);
  });

  it('100개 active에서는 구슬 label을 생략하되 구슬은 모두 그린다', () => {
    const main = createContext(260, 240, () => 0.1);
    const minimap = createContext(104, 240, () => 0.1);
    const active = Array.from({ length: 100 }, (_, index) => (
      createActive(`a:${index}`, 'a', '짱구', 13, index + 1)
    ));

    new CanvasRenderer(NOTME_COURSE).render(
      { main: main.context, minimap: minimap.context },
      createSnapshot({ active }),
      cameraView,
    );

    expect(main.fills.filter(({ arc }) => arc?.[2] === 0.25)).toHaveLength(100);
    expect(main.fillTexts).toEqual([]);
    expect(minimap.fillTexts).toEqual([]);
  });
});
