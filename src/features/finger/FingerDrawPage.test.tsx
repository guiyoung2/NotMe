import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

import { FingerDrawPage } from './FingerDrawPage';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

function renderPage() {
  render(<MemoryRouter><FingerDrawPage /></MemoryRouter>);
  return screen.getByTestId('finger-touch-field');
}

describe('FingerDrawPage', () => {
  it('두 번째 포인터에서 카운트다운 안내를 표시한다', () => {
    const field = renderPage();
    fireEvent.pointerDown(field, { pointerId: 1, clientX: 40, clientY: 80 });
    fireEvent.pointerDown(field, { pointerId: 2, clientX: 120, clientY: 180 });

    expect(screen.getByText('그대로 유지하세요')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('3초 뒤 선택 결과와 다시 하기 버튼을 표시한다', () => {
    vi.useFakeTimers();
    const field = renderPage();
    fireEvent.pointerDown(field, { pointerId: 1, clientX: 40, clientY: 80 });
    fireEvent.pointerDown(field, { pointerId: 2, clientX: 120, clientY: 180 });

    act(() => vi.advanceTimersByTime(3_000));

    expect(screen.getByText('선택됐어요!')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '다시 하기' })).toBeInTheDocument();
  });

  it('참가자가 바뀌면 다시 시작 안내를 표시한다', () => {
    const field = renderPage();
    fireEvent.pointerDown(field, { pointerId: 1, clientX: 40, clientY: 80 });
    fireEvent.pointerDown(field, { pointerId: 2, clientX: 120, clientY: 180 });
    fireEvent.pointerDown(field, { pointerId: 3, clientX: 220, clientY: 280 });

    expect(screen.getByText('다시 시작해요')).toBeInTheDocument();
    expect(screen.getByText('손가락을 유지하세요')).toBeInTheDocument();
  });

  it('결과 뒤 다시 하기는 대기 화면으로 돌아가고 포인터 변경은 결과를 지우지 않는다', () => {
    vi.useFakeTimers();
    const field = renderPage();
    fireEvent.pointerDown(field, { pointerId: 1, clientX: 40, clientY: 80 });
    fireEvent.pointerDown(field, { pointerId: 2, clientX: 120, clientY: 180 });
    act(() => vi.advanceTimersByTime(3_000));

    fireEvent.pointerDown(field, { pointerId: 3, clientX: 220, clientY: 280 });
    expect(screen.getByText('선택됐어요!')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '다시 하기' }));
    expect(screen.getByText('화면에 손가락을 올려주세요')).toBeInTheDocument();
  });

  it('상단 초기화 버튼을 표시하지 않는다', () => {
    renderPage();

    expect(screen.queryByRole('button', { name: '초기화' })).not.toBeInTheDocument();
  });

  it('카운트다운 중 홈으로 이동할 때 종료 확인을 요청한다', () => {
    const field = renderPage();
    fireEvent.pointerDown(field, { pointerId: 1, clientX: 40, clientY: 80 });
    fireEvent.pointerDown(field, { pointerId: 2, clientX: 120, clientY: 180 });

    fireEvent.click(screen.getByRole('button', { name: '홈으로' }));

    expect(screen.getByRole('dialog', { name: '현재 게임을 종료할까요?' })).toBeInTheDocument();
  });
});
