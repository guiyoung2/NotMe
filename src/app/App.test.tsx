import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
  localStorage.clear();
  vi.restoreAllMocks();
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

  it('마블 경로에 실제 룰렛 설정 화면을 렌더링한다', () => {
    window.history.replaceState({}, '', '/marble');

    render(<App />);

    expect(screen.getByLabelText('참가자 1 이름')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '레이스 시작' })).toBeDisabled();
  });

  it('/ladder에서 설정, 개별 공개, 전체 공개, 초기화 흐름을 실행한다', async () => {
    const user = userEvent.setup();
    vi.spyOn(Math, 'random').mockReturnValue(0.99);
    window.history.replaceState({}, '', '/ladder');
    render(<App />);

    await user.type(screen.getByLabelText('참가자 1'), '짱구');
    await user.type(screen.getByLabelText('참가자 2'), '철수');
    await user.type(screen.getByLabelText('결과 1'), '통과');
    await user.type(screen.getByLabelText('결과 2'), '벌칙');
    await user.click(screen.getByRole('button', { name: '게임 시작' }));
    await user.click(screen.getByRole('button', { name: '짱구 경로 보기' }));

    expect(screen.getByText('통과')).toBeInTheDocument();
    expect(screen.queryByText('벌칙')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '전체 결과 보기' }));
    expect(screen.getByText('벌칙')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '초기화' }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: '초기화' }));

    expect(localStorage.getItem('notme:draft:ladder')).toBeNull();
    expect(screen.getByLabelText('참가자 1')).toHaveValue('');
  });

  it('빈 행을 추가한 사다리도 홈으로 이동하면 draft를 지우고 두 칸으로 재진입한다', async () => {
    const user = userEvent.setup();
    window.history.replaceState({}, '', '/ladder');
    render(<App />);

    await user.click(screen.getByRole('button', { name: '사다리 추가' }));
    expect(screen.getByLabelText('참가자 3')).toHaveValue('');
    expect(localStorage.getItem('notme:draft:ladder')).not.toBeNull();

    await user.click(screen.getByRole('button', { name: '홈으로' }));
    expect(screen.getByRole('heading', { name: '게임 선택' })).toBeInTheDocument();
    expect(localStorage.getItem('notme:draft:ladder')).toBeNull();

    await user.click(screen.getByRole('link', { name: /사다리 타기/ }));
    expect(screen.getByLabelText('참가자 1')).toHaveValue('');
    expect(screen.getByLabelText('참가자 2')).toHaveValue('');
    expect(screen.getByLabelText('결과 1')).toHaveValue('');
    expect(screen.getByLabelText('결과 2')).toHaveValue('');
    expect(screen.queryByLabelText('참가자 3')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('결과 3')).not.toBeInTheDocument();
  });
});
