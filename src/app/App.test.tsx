import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';

const { useRegisterSW } = vi.hoisted(() => ({
  useRegisterSW: vi.fn(),
}));

vi.mock('virtual:pwa-register/react', () => ({ useRegisterSW }));

beforeEach(() => {
  useRegisterSW.mockReset();
  useRegisterSW.mockReturnValue({
    needRefresh: [false, vi.fn()],
    offlineReady: [false, vi.fn()],
    updateServiceWorker: vi.fn(),
  });
});

afterEach(() => {
  cleanup();
  window.history.replaceState({}, '', '/');
});

describe('App', () => {
  it('NotMe 홈을 렌더링한다', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: '게임 선택' })).toBeInTheDocument();
  });

  it.each([
    ['스톱워치', '/stopwatch'],
    ['사다리 타기', '/ladder'],
    ['마블 룰렛', '/marble'],
  ])('%s 링크가 올바른 경로를 가리킨다', (name, href) => {
    render(<App />);
    expect(screen.getByRole('link', { name: new RegExp(name) })).toHaveAttribute('href', href);
  });

  it.each([
    ['/', '게임 선택'],
    ['/stopwatch', '스톱워치'],
    ['/ladder', '사다리 타기'],
    ['/marble', '마블 룰렛'],
  ])('%s 루트 배포 경로를 렌더링한다', (pathname, heading) => {
    window.history.replaceState({}, '', pathname);

    render(<App />);

    expect(screen.getByRole('heading', { name: heading })).toBeInTheDocument();
  });

  it.each(['/stopwatch', '/ladder', '/marble'])('%s 직접 경로에서도 서비스 워커를 등록한다', (pathname) => {
    window.history.replaceState({}, '', pathname);

    render(<App />);

    expect(useRegisterSW).toHaveBeenCalledTimes(1);
  });

  it.each(['/stopwatch', '/ladder', '/marble'])('%s에서는 업데이트 버튼을 표시하지 않는다', (pathname) => {
    useRegisterSW.mockReturnValue({
      needRefresh: [true, vi.fn()],
      offlineReady: [false, vi.fn()],
      updateServiceWorker: vi.fn(),
    });
    window.history.replaceState({}, '', pathname);

    render(<App />);

    expect(screen.queryByRole('button', { name: '새 버전 적용' })).not.toBeInTheDocument();
  });

  it('스톱워치 경로에 게임 설정 화면을 렌더링한다', () => {
    window.history.replaceState({}, '', '/stopwatch');

    render(<App />);

    expect(screen.getByLabelText('참가자 1')).toBeInTheDocument();
    expect(screen.getByLabelText('참가자 2')).toBeInTheDocument();
  });
});
