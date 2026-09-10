import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { MarbleRace, type MarbleRaceRuntimeFactory } from './MarbleRace';
import type { MarbleGameConfig } from './MarbleSetup';
import type { RaceSnapshot } from './engine/RouletteEngine';

const config: MarbleGameConfig = {
  participants: [
    { id: 'a', name: '짱구', count: 1 },
    { id: 'b', name: '철수', count: 1 },
  ],
  winnerMode: 'first',
  skillsEnabled: false,
  shuffledMarbles: [
    { id: 'a:0', participantId: 'a', name: '짱구' },
    { id: 'b:0', participantId: 'b', name: '철수' },
  ],
};

const runningSnapshot: RaceSnapshot = {
  active: [
    { ...config.shuffledMarbles[0], body: { id: 'a:0', x: 10, y: 20, angle: 0, radius: 0.25 } },
    { ...config.shuffledMarbles[1], body: { id: 'b:0', x: 12, y: 12, angle: 0, radius: 0.25 } },
  ],
  dynamicObstacles: [],
  skillEffects: [],
  skillActivationCount: 0,
  finishOrder: [],
  winner: null,
  winnerMode: 'first',
  speed: 1,
};

function createRuntime(overrides: {
  init?: () => Promise<boolean>;
  advance?: (deltaMs: number) => void;
  snapshot?: () => RaceSnapshot;
} = {}) {
  const runtime = {
    engine: {
      init: vi.fn(overrides.init ?? (async () => true)),
      advance: vi.fn(overrides.advance ?? (() => {})),
      snapshot: vi.fn(overrides.snapshot ?? (() => runningSnapshot)),
      setFastForward: vi.fn(),
      destroy: vi.fn(),
    },
    camera: { update: vi.fn(() => ({ leftX: 0, width: 26, centerY: 12, topY: 0, height: 24, zoom: 1 })) },
    renderer: { render: vi.fn() },
  };
  const factory = vi.fn(() => runtime) as MarbleRaceRuntimeFactory;
  return { runtime, factory };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((onResolve, onReject) => {
    resolve = onResolve;
    reject = onReject;
  });
  return { promise, resolve, reject };
}

beforeEach(() => {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => ({} as CanvasRenderingContext2D));
  Object.defineProperty(HTMLCanvasElement.prototype, 'setPointerCapture', {
    configurable: true,
    value: vi.fn(),
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('MarbleRace 수명', () => {
  it('예상 순위는 표시하지 않고 실제 도착 명단과 진행 수만 즉시 갱신한다', async () => {
    const frames: FrameRequestCallback[] = [];
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => { frames.push(callback); return frames.length; });
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
    let snapshot = structuredClone(runningSnapshot);
    const { factory } = createRuntime({ snapshot: () => snapshot });
    const { container } = render(<MarbleRace config={config} onFinish={() => {}} onAbort={() => {}} onError={() => {}} runtimeFactory={factory} />);
    await act(async () => Promise.resolve());
    const live = container.querySelector('[aria-live="polite"]')!;
    const initialAnnouncement = live.textContent;
    const ranking = screen.getByRole('list', { name: '도착 명단' });
    expect(screen.getByLabelText('도착 진행')).toHaveTextContent('도착 0 / 2');
    const initialRanking = ranking.textContent;
    act(() => frames.shift()?.(0));
    snapshot = { ...snapshot, active: snapshot.active.map((marble, index) => ({ ...marble, body: { ...marble.body, y: index === 1 ? 30 : 20 } })) };
    act(() => frames.shift()?.(16));
    expect(live.textContent).toBe(initialAnnouncement);
    expect(ranking.textContent).toBe(initialRanking);
    act(() => frames.shift()?.(500));
    expect(ranking.textContent).toBe(initialRanking);
    expect(screen.queryByText(/예상/)).not.toBeInTheDocument();
    expect(live.textContent).toBe(initialAnnouncement);

    snapshot = { ...snapshot, active: snapshot.active.slice(0, 1), finishOrder: [{ ...config.shuffledMarbles[1], rank: 1 }] };
    act(() => frames.shift()?.(516));
    expect(ranking).toHaveTextContent('1위 철수 1번 구슬');
    expect(ranking).not.toHaveTextContent('짱구');
    expect(ranking).not.toHaveTextContent('b:0');
    expect(screen.getByLabelText('도착 진행')).toHaveTextContent('도착 1 / 2');
    expect(live).toHaveTextContent(/1위.*철수.*도착/);
    const announcedNode = live.firstChild;
    act(() => frames.shift()?.(532));
    act(() => frames.shift()?.(1100));
    expect(live.firstChild).toBe(announcedNode);
  });

  it('Canvas의 실제 크기를 카메라에 전달한다', async () => {
    const frames: FrameRequestCallback[] = [];
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => { frames.push(callback); return frames.length; });
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
    const { runtime, factory } = createRuntime();
    render(<MarbleRace config={config} onFinish={() => {}} onAbort={() => {}} onError={() => {}} runtimeFactory={factory} />);
    const canvas = screen.getByTestId('marble-canvas');
    vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({ width: 288, height: 496 } as DOMRect);
    await act(async () => Promise.resolve());
    act(() => frames.shift()?.(0));
    expect(runtime.camera.update).toHaveBeenCalledWith(runningSnapshot, expect.any(Object), { width: 288, height: 496 });
  });

  it('초기화가 끝난 뒤 timestamp delta로 그리고 당첨을 한 번만 알린 후 loop를 멈춘다', async () => {
    const frames: FrameRequestCallback[] = [];
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      frames.push(callback);
      return frames.length;
    });
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
    let snapshot = runningSnapshot;
    const finishedSnapshot: RaceSnapshot = {
      ...runningSnapshot,
      active: [],
      finishOrder: [
        { ...config.shuffledMarbles[0], rank: 1 },
        { ...config.shuffledMarbles[1], rank: 2 },
      ],
      winner: { ...config.shuffledMarbles[0], rank: 1 },
    };
    const { runtime, factory } = createRuntime({ snapshot: () => snapshot });
    const onFinish = vi.fn();

    render(<MarbleRace config={config} onFinish={onFinish} onAbort={() => {}} onError={() => {}} runtimeFactory={factory} />);
    expect(screen.getByRole('status')).toHaveTextContent('룰렛을 준비하고 있어요');
    expect(frames).toHaveLength(0);
    await act(async () => Promise.resolve());

    expect(factory).toHaveBeenCalledOnce();
    expect(runtime.engine.init).toHaveBeenCalledOnce();
    expect(frames).toHaveLength(1);
    act(() => frames.shift()?.(100));
    act(() => frames.shift()?.(116));
    expect(runtime.engine.advance).toHaveBeenNthCalledWith(1, 0);
    expect(runtime.engine.advance).toHaveBeenNthCalledWith(2, 16);

    snapshot = finishedSnapshot;
    act(() => frames.shift()?.(132));
    expect(onFinish).toHaveBeenCalledOnce();
    expect(onFinish).toHaveBeenCalledWith(finishedSnapshot);
    expect(frames).toHaveLength(0);
  });

  it('초기화 도중 unmount되면 늦은 완료가 frame이나 오류 callback을 시작하지 않는다', async () => {
    const initialization = deferred<boolean>();
    const requestFrame = vi.spyOn(window, 'requestAnimationFrame').mockReturnValue(1);
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
    const { runtime, factory } = createRuntime({ init: () => initialization.promise });
    const onError = vi.fn();
    const view = render(
      <MarbleRace config={config} onFinish={() => {}} onAbort={() => {}} onError={onError} runtimeFactory={factory} />,
    );

    view.unmount();
    await act(async () => initialization.resolve(true));

    expect(requestFrame).not.toHaveBeenCalled();
    expect(onError).not.toHaveBeenCalled();
    expect(runtime.engine.setFastForward).toHaveBeenLastCalledWith(false);
    expect(runtime.engine.destroy).toHaveBeenCalledOnce();
  });

  it('config가 바뀌면 이전 runtime을 정리하고 새 초기화 동안 준비 상태로 돌아간다', async () => {
    const secondInitialization = deferred<boolean>();
    vi.spyOn(window, 'requestAnimationFrame').mockReturnValueOnce(11).mockReturnValueOnce(12);
    const cancelFrame = vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
    const first = createRuntime();
    const second = createRuntime({ init: () => secondInitialization.promise });
    const factory = vi.fn()
      .mockReturnValueOnce(first.runtime)
      .mockReturnValueOnce(second.runtime) as MarbleRaceRuntimeFactory;
    const view = render(
      <MarbleRace config={config} onFinish={() => {}} onAbort={() => {}} onError={() => {}} runtimeFactory={factory} />,
    );
    await act(async () => Promise.resolve());
    expect(screen.queryByText('룰렛을 준비하고 있어요')).not.toBeInTheDocument();

    view.rerender(
      <MarbleRace
        config={{ ...config, winnerMode: 'last' }}
        onFinish={() => {}}
        onAbort={() => {}}
        onError={() => {}}
        runtimeFactory={factory}
      />,
    );

    expect(screen.getByRole('status')).toHaveTextContent('룰렛을 준비하고 있어요');
    expect(first.runtime.engine.setFastForward).toHaveBeenLastCalledWith(false);
    expect(first.runtime.engine.destroy).toHaveBeenCalledOnce();
    expect(cancelFrame).toHaveBeenCalledWith(11);
    expect(second.runtime.engine.init).toHaveBeenCalledOnce();
  });

  it('초기화 오류를 한 번만 알리고 frame을 시작하지 않는다', async () => {
    const initialization = deferred<boolean>();
    const requestFrame = vi.spyOn(window, 'requestAnimationFrame').mockReturnValue(1);
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
    const onError = vi.fn();
    const { factory } = createRuntime({ init: () => initialization.promise });
    render(<MarbleRace config={config} onFinish={() => {}} onAbort={() => {}} onError={onError} runtimeFactory={factory} />);

    await act(async () => initialization.reject(new Error('WASM 실패')));
    await act(async () => Promise.resolve());

    expect(onError).toHaveBeenCalledOnce();
    expect(requestFrame).not.toHaveBeenCalled();
  });

  it('frame 오류를 한 번만 알리고 loop와 포인터 입력을 멈춘다', async () => {
    let frame: FrameRequestCallback | undefined;
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      frame = callback;
      return 17;
    });
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
    const onError = vi.fn();
    const { runtime, factory } = createRuntime({
      advance: () => { throw new Error('frame 실패'); },
    });
    render(<MarbleRace config={config} onFinish={() => {}} onAbort={() => {}} onError={onError} runtimeFactory={factory} />);
    await act(async () => Promise.resolve());
    const failedFrame = frame;

    act(() => failedFrame?.(100));
    act(() => failedFrame?.(116));
    fireEvent.pointerDown(screen.getByTestId('marble-canvas'), { pointerId: 3 });

    expect(onError).toHaveBeenCalledOnce();
    expect(runtime.engine.advance).toHaveBeenCalledOnce();
    expect(runtime.engine.setFastForward).not.toHaveBeenCalledWith(true);
  });
});

describe('MarbleRace 포인터 배속', () => {
  it.each(['pointerUp', 'pointerCancel', 'lostPointerCapture'] as const)(
    '%s에서 즉시 정상 속도로 돌아간다',
    async (endingEvent) => {
      vi.spyOn(window, 'requestAnimationFrame').mockReturnValue(1);
      vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
      const { runtime, factory } = createRuntime();
      render(<MarbleRace config={config} onFinish={() => {}} onAbort={() => {}} onError={() => {}} runtimeFactory={factory} />);
      await act(async () => Promise.resolve());
      const canvas = screen.getByTestId('marble-canvas');

      fireEvent.pointerDown(canvas, { pointerId: 7 });
      fireEvent[endingEvent](canvas, { pointerId: 7 });

      expect(canvas.setPointerCapture).toHaveBeenCalledWith(7);
      expect(runtime.engine.setFastForward).toHaveBeenNthCalledWith(1, true);
      expect(runtime.engine.setFastForward).toHaveBeenNthCalledWith(2, false);
    },
  );

  it('window blur와 문서 숨김에서도 배속을 해제하며 중복 종료는 무시한다', async () => {
    vi.spyOn(window, 'requestAnimationFrame').mockReturnValue(1);
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
    const visibility = vi.spyOn(document, 'visibilityState', 'get');
    visibility.mockReturnValue('visible');
    const { runtime, factory } = createRuntime();
    render(<MarbleRace config={config} onFinish={() => {}} onAbort={() => {}} onError={() => {}} runtimeFactory={factory} />);
    await act(async () => Promise.resolve());
    const canvas = screen.getByTestId('marble-canvas');

    fireEvent.pointerDown(canvas, { pointerId: 1 });
    fireEvent.blur(window);
    fireEvent.pointerUp(canvas, { pointerId: 1 });
    fireEvent.pointerDown(canvas, { pointerId: 2 });
    visibility.mockReturnValue('hidden');
    fireEvent(document, new Event('visibilitychange'));

    expect(runtime.engine.setFastForward.mock.calls).toEqual([
      [true], [false], [true], [false],
    ]);
  });

  it('맵 안에 도착 명단과 배속 안내, 미니맵, 중단 버튼을 제공한다', async () => {
    vi.spyOn(window, 'requestAnimationFrame').mockReturnValue(1);
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
    const onAbort = vi.fn();
    const { factory } = createRuntime();
    render(<MarbleRace config={config} onFinish={() => {}} onAbort={onAbort} onError={() => {}} runtimeFactory={factory} />);
    await act(async () => Promise.resolve());

    expect(screen.getByText('누르고 있는 동안 4배속')).toBeInTheDocument();
    expect(screen.getByRole('list', { name: '도착 명단' }).closest('.marble-race__stage')).not.toBeNull();
    expect(screen.getByTestId('marble-minimap')).toHaveAccessibleName('전체 코스 미니맵');
    fireEvent.click(screen.getByRole('button', { name: '레이스 중단' }));
    expect(onAbort).toHaveBeenCalledOnce();
  });
});
