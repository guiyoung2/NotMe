import { render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { MarbleGameConfig } from './MarbleSetup';
import type { RaceSnapshot } from './engine/RouletteEngine';
import type { CameraView } from './engine/Camera';

const renderCanvas = vi.hoisted(() => vi.fn());

vi.mock('./engine/CanvasRenderer', () => ({
  CanvasRenderer: vi.fn().mockImplementation(function CanvasRenderer() {
    return { render: renderCanvas };
  }),
}));

import { MarbleResultCourse } from './MarbleResultCourse';

const config: MarbleGameConfig = {
  participants: [
    { id: 'a', name: '짱구', count: 1 },
    { id: 'b', name: '철수', count: 1 },
  ],
  winnerMode: 'last',
  skillsEnabled: false,
  shuffledMarbles: [
    { id: 'a:0', participantId: 'a', name: '짱구' },
    { id: 'b:0', participantId: 'b', name: '철수' },
  ],
};

const snapshot: RaceSnapshot = {
  active: [{ ...config.shuffledMarbles[1], body: { id: 'b:0', x: 14, y: 106, angle: 0.4, radius: 0.25 } }],
  dynamicObstacles: [{ id: 'spinner:finish-gate', kind: 'spinner', center: { x: 14, y: 106.75 }, length: 4, angle: 1.2 }],
  skillEffects: [],
  skillActivationCount: 0,
  finishOrder: [{ ...config.shuffledMarbles[0], rank: 1 }, { ...config.shuffledMarbles[1], rank: 2 }],
  winner: { ...config.shuffledMarbles[1], rank: 2 },
  winnerMode: 'last',
  speed: 1,
};

const cameraView: CameraView = {
  leftX: 3, width: 18, centerY: 106, topY: 94, height: 24, zoom: 1,
};

afterEach(() => {
  vi.restoreAllMocks();
  renderCanvas.mockClear();
});

describe('MarbleResultCourse', () => {
  it('완주 직후에는 정적 전체 코스 대신 마지막 레이스 snapshot과 카메라를 그대로 그린다', () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({} as CanvasRenderingContext2D);
    vi.spyOn(HTMLCanvasElement.prototype, 'getBoundingClientRect').mockReturnValue({ width: 320, height: 480 } as DOMRect);

    render(<MarbleResultCourse config={config} finishOrder={snapshot.finishOrder} snapshot={snapshot} cameraView={cameraView} />);

    expect(renderCanvas).toHaveBeenCalledWith(
      expect.any(Object),
      snapshot,
      cameraView,
    );
  });
});
