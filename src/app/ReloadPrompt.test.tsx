import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ReloadPrompt } from './ReloadPrompt';

const { updateServiceWorker, useRegisterSW } = vi.hoisted(() => ({
  updateServiceWorker: vi.fn(),
  useRegisterSW: vi.fn(),
}));

vi.mock('virtual:pwa-register/react', () => ({ useRegisterSW }));

describe('ReloadPrompt', () => {
  beforeEach(() => {
    updateServiceWorker.mockReset();
    useRegisterSW.mockReturnValue({
      needRefresh: [false, vi.fn()],
      offlineReady: [false, vi.fn()],
      updateServiceWorker,
    });
  });

  it('새 버전이 준비되지 않으면 아무것도 렌더링하지 않는다', () => {
    render(<ReloadPrompt />);

    expect(screen.queryByRole('button', { name: '새 버전 적용' })).not.toBeInTheDocument();
  });

  it('새 버전 적용을 누르면 서비스 워커를 갱신한다', async () => {
    const user = userEvent.setup();
    useRegisterSW.mockReturnValue({
      needRefresh: [true, vi.fn()],
      offlineReady: [false, vi.fn()],
      updateServiceWorker,
    });
    render(<ReloadPrompt />);

    await user.click(screen.getByRole('button', { name: '새 버전 적용' }));

    expect(updateServiceWorker).toHaveBeenCalledWith(true);
  });
});
