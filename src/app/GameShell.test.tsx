import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { GameShell } from './GameShell';

function CurrentPath() {
  const location = useLocation();
  return <output>{location.pathname}</output>;
}

function renderShell({ dirty = false, onReset = vi.fn() }: { dirty?: boolean; onReset?: () => void } = {}) {
  render(
    <MemoryRouter initialEntries={['/stopwatch']}>
      <GameShell title="테스트" dirty={dirty} onReset={onReset}>내용</GameShell>
      <CurrentPath />
    </MemoryRouter>,
  );

  return { onReset };
}

afterEach(cleanup);

describe('GameShell', () => {
  it('홈 이동을 아이콘 버튼의 접근 가능한 이름으로 제공한다', () => {
    renderShell();

    expect(screen.getByRole('button', { name: '홈으로' })).toHaveAttribute('aria-label', '홈으로');
  });

  it('진행 중 홈 이동을 취소할 수 있다', async () => {
    const user = userEvent.setup();
    renderShell({ dirty: true });

    await user.click(screen.getByRole('button', { name: '홈으로' }));
    expect(screen.getByRole('dialog', { name: '현재 게임을 종료할까요?' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '취소' }));
    expect(screen.queryByRole('dialog', { name: '현재 게임을 종료할까요?' })).not.toBeInTheDocument();
    expect(screen.getByText('/stopwatch')).toBeInTheDocument();
  });

  it('진행 중 홈 이동을 확인하면 초기화 후 홈으로 이동한다', async () => {
    const user = userEvent.setup();
    const { onReset } = renderShell({ dirty: true });

    await user.click(screen.getByRole('button', { name: '홈으로' }));
    await user.click(screen.getByRole('button', { name: '종료' }));

    expect(onReset).toHaveBeenCalledTimes(1);
    expect(screen.getByText('/')).toBeInTheDocument();
  });

  it('진행 중이 아니면 즉시 홈으로 이동한다', async () => {
    const user = userEvent.setup();
    const { onReset } = renderShell();

    await user.click(screen.getByRole('button', { name: '홈으로' }));
    expect(onReset).toHaveBeenCalledTimes(1);
    expect(screen.getByText('/')).toBeInTheDocument();
  });

  it('초기화는 확인 후 초기화하고 현재 게임에 머문다', async () => {
    const user = userEvent.setup();
    const { onReset } = renderShell({ dirty: true });

    await user.click(screen.getByRole('button', { name: '초기화' }));
    expect(screen.getByRole('dialog', { name: '현재 게임을 초기화할까요?' })).toBeInTheDocument();

    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: '초기화' }));
    expect(onReset).toHaveBeenCalledTimes(1);
    expect(screen.getByText('/stopwatch')).toBeInTheDocument();
  });

  it('초기화 버튼을 숨길 수 있다', () => {
    render(
      <MemoryRouter>
        <GameShell title="테스트" dirty={false} onReset={vi.fn()} showReset={false}>내용</GameShell>
      </MemoryRouter>,
    );

    expect(screen.queryByRole('button', { name: '초기화' })).not.toBeInTheDocument();
  });

  it('확인창을 열면 취소 버튼으로 포커스를 옮긴다', async () => {
    const user = userEvent.setup();
    renderShell({ dirty: true });

    await user.click(screen.getByRole('button', { name: '홈으로' }));
    expect(within(screen.getByRole('dialog')).getByRole('button', { name: '취소' })).toHaveFocus();
  });

  it('확인창 안에서 Tab과 Shift+Tab 포커스를 순환한다', async () => {
    const user = userEvent.setup();
    renderShell({ dirty: true });

    await user.click(screen.getByRole('button', { name: '홈으로' }));
    const dialog = screen.getByRole('dialog');
    const cancelButton = within(dialog).getByRole('button', { name: '취소' });
    const confirmButton = within(dialog).getByRole('button', { name: '종료' });

    await user.tab();
    expect(confirmButton).toHaveFocus();
    await user.tab();
    expect(cancelButton).toHaveFocus();
    await user.tab({ shift: true });
    expect(confirmButton).toHaveFocus();
  });

  it('확인창을 닫으면 원래 트리거로 포커스를 돌린다', async () => {
    const user = userEvent.setup();
    renderShell({ dirty: true });
    const homeButton = screen.getByRole('button', { name: '홈으로' });

    await user.click(homeButton);
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: '취소' }));

    expect(homeButton).toHaveFocus();
  });
});
