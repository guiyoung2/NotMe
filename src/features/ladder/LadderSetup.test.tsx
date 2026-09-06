import { useState } from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { LadderSetup, type LadderSetupValue } from './LadderSetup';

type SetupHarnessProps = {
  initialValue: LadderSetupValue;
  onStart?: () => void;
  onValue?: (value: LadderSetupValue) => void;
};

function SetupHarness({ initialValue, onStart = () => {}, onValue = () => {} }: SetupHarnessProps) {
  const [value, setValue] = useState(initialValue);

  function handleChange(nextValue: LadderSetupValue) {
    setValue(nextValue);
    onValue(nextValue);
  }

  return <LadderSetup value={value} onChange={handleChange} onStart={onStart} />;
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('LadderSetup', () => {
  it('사다리를 추가하거나 제거하면 참가자와 결과 수를 함께 바꾼다', async () => {
    const user = userEvent.setup();
    let lastValue: LadderSetupValue = { names: ['', ''], outcomes: ['', ''] };
    render(<SetupHarness initialValue={lastValue} onValue={(value) => { lastValue = value; }} />);

    const removeButton = screen.getByRole('button', { name: '사다리 제거' });
    expect(removeButton).toBeDisabled();
    expect(screen.getByRole('status', { name: '현재 사다리 수' })).toHaveTextContent('2개');

    await user.click(screen.getByRole('button', { name: '사다리 추가' }));

    expect(lastValue.names).toHaveLength(3);
    expect(lastValue.outcomes).toHaveLength(3);
    expect(screen.getByLabelText('참가자 3')).toBeInTheDocument();
    expect(screen.getByLabelText('결과 3')).toBeInTheDocument();
    expect(screen.getByRole('status', { name: '현재 사다리 수' })).toHaveTextContent('3개');
    expect(removeButton).toBeEnabled();

    await user.click(removeButton);

    expect(lastValue.names).toHaveLength(2);
    expect(lastValue.outcomes).toHaveLength(2);
    expect(removeButton).toBeDisabled();
  });

  it('네 칸을 선택하면 벌칙 하나와 통과 세 개를 채운다', async () => {
    const user = userEvent.setup();
    let lastValue: LadderSetupValue = { names: ['', ''], outcomes: ['', ''] };
    render(<SetupHarness initialValue={lastValue} onValue={(value) => { lastValue = value; }} />);

    await user.click(screen.getByRole('button', { name: '사다리 추가' }));
    await user.click(screen.getByRole('button', { name: '사다리 추가' }));
    await user.click(screen.getByRole('button', { name: '벌칙 1개와 통과로 채우기' }));

    expect(lastValue.outcomes).toEqual(['벌칙', '통과', '통과', '통과']);
  });

  it('각 번호의 참가자와 결과를 개별로 바꾼다', async () => {
    const user = userEvent.setup();
    let lastValue: LadderSetupValue = { names: ['', ''], outcomes: ['', ''] };
    render(<SetupHarness initialValue={lastValue} onValue={(value) => { lastValue = value; }} />);

    await user.type(screen.getByLabelText('참가자 1'), '짱구');
    await user.type(screen.getByLabelText('결과 2'), '벌칙');

    expect(lastValue).toEqual({ names: ['짱구', ''], outcomes: ['', '벌칙'] });
  });

  it('참가자와 결과 순서를 서로 독립적으로 섞는다', async () => {
    const user = userEvent.setup();
    let lastValue: LadderSetupValue = {
      names: ['짱구', '철수', '유리'],
      outcomes: ['통과', '벌칙', '꽝'],
    };
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0.99)
      .mockReturnValueOnce(0.99)
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0);
    render(<SetupHarness initialValue={lastValue} onValue={(value) => { lastValue = value; }} />);

    await user.click(screen.getByRole('button', { name: '참가자와 결과 섞기' }));

    expect(lastValue.names).toEqual(['짱구', '철수', '유리']);
    expect(lastValue.outcomes).toEqual(['벌칙', '꽝', '통과']);
  });

  it('모든 참가자와 결과의 trim 값이 채워져야 시작한다', async () => {
    const user = userEvent.setup();
    const onStart = vi.fn();
    render(<SetupHarness initialValue={{ names: ['', ''], outcomes: ['', ''] }} onStart={onStart} />);
    const startButton = screen.getByRole('button', { name: '게임 시작' });

    await user.type(screen.getByLabelText('참가자 1'), '  짱구  ');
    await user.type(screen.getByLabelText('참가자 2'), '철수');
    await user.type(screen.getByLabelText('결과 1'), '통과');
    await user.type(screen.getByLabelText('결과 2'), '   ');
    expect(startButton).toBeDisabled();

    await user.clear(screen.getByLabelText('결과 2'));
    await user.type(screen.getByLabelText('결과 2'), '벌칙');
    expect(startButton).toBeEnabled();

    await user.click(startButton);
    expect(onStart).toHaveBeenCalledOnce();
  });

  it('참가자와 결과의 길이가 다르면 시작할 수 없다', () => {
    render(
      <LadderSetup
        value={{ names: ['짱구', '철수'], outcomes: ['통과'] }}
        onChange={() => {}}
        onStart={() => {}}
      />,
    );

    expect(screen.getByRole('button', { name: '게임 시작' })).toBeDisabled();
  });
});
