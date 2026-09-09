import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { MarbleArrivals } from './MarbleArrivals';
import type { MarbleGameConfig } from './MarbleSetup';
import { expandMarbles } from './marbleConfig';

const participants = [{ id: '_r_0_participant', name: '짱구', count: 15 }, { id: 'b', name: '철수', count: 1 }];
const config: MarbleGameConfig = {
  participants, winnerMode: 'first', skillsEnabled: false, shuffledMarbles: expandMarbles(participants),
};
const arrivals = config.shuffledMarbles.map((marble, index) => ({ ...marble, rank: index + 1 }));

beforeEach(() => {
  vi.useFakeTimers();
  // jsdom에는 레이아웃이 없어 명단의 실제 스크롤 범위만 제공한다.
  vi.spyOn(HTMLElement.prototype, 'scrollHeight', 'get').mockImplementation(function (this: HTMLElement) {
    return this.children.length * 30;
  });
  vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(120);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('도착 명단 스크롤', () => {
  it.each(['wheel', 'touchMove', 'scroll'] as const)('%s 조작 후 2초 동안 현재 위치를 유지하고 추가 도착이 없어도 최신 항목으로 돌아간다', (event) => {
    const view = render(<MarbleArrivals config={config} finishOrder={arrivals.slice(0, 10)} />);
    const list = screen.getByRole('list', { name: '도착 명단' });
    fireEvent.scroll(list);
    list.scrollTop = 30;
    fireEvent[event](list);
    view.rerender(<MarbleArrivals config={config} finishOrder={arrivals.slice(0, 12)} />);
    expect(list.scrollTop).toBe(30);
    act(() => vi.advanceTimersByTime(1999));
    expect(list.scrollTop).toBe(30);
    act(() => vi.advanceTimersByTime(1));
    expect(list.scrollTop).toBe(240);
    fireEvent.scroll(list);
    view.rerender(<MarbleArrivals config={config} finishOrder={arrivals.slice(0, 13)} />);
    expect(list.scrollTop).toBe(270);
  });

  it('사용자가 계속 스크롤하면 마지막 입력부터 2초를 기다리고 unmount에서 타이머를 정리한다', () => {
    const view = render(<MarbleArrivals config={config} finishOrder={arrivals.slice(0, 10)} />);
    const list = screen.getByRole('list', { name: '도착 명단' });
    list.scrollTop = 20;
    fireEvent.scroll(list);
    act(() => vi.advanceTimersByTime(1500));
    list.scrollTop = 40;
    fireEvent.scroll(list);
    act(() => vi.advanceTimersByTime(1999));
    expect(list.scrollTop).toBe(40);
    act(() => vi.advanceTimersByTime(1));
    expect(list.scrollTop).toBe(180);
    fireEvent.wheel(list);
    expect(vi.getTimerCount()).toBe(1);
    view.unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('8위 이후 도착도 전부 표시하고 새 도착을 즉시 따라가며 자체 scroll 이벤트로 멈추지 않는다', () => {
    const view = render(<MarbleArrivals config={config} finishOrder={arrivals.slice(0, 10)} />);
    const list = screen.getByRole('list', { name: '도착 명단' });
    expect(list.children).toHaveLength(10);
    expect(list).toHaveTextContent('10위 짱구 10번 구슬');
    expect(list).not.toHaveTextContent('_r_0_participant');
    expect(list.scrollTop).toBe(180);
    fireEvent.scroll(list);
    view.rerender(<MarbleArrivals config={config} finishOrder={arrivals.slice(0, 11)} />);
    expect(list.scrollTop).toBe(210);
    fireEvent.scroll(list);
    view.rerender(<MarbleArrivals config={config} finishOrder={arrivals.slice(0, 12)} />);
    expect(list.scrollTop).toBe(240);
  });
});
