import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('react', async () => {
  const actual = await vi.importActual<typeof import('react')>('react');
  return { ...actual, useId: () => 'marble-form' };
});

import { MarbleSetup, type MarbleGameConfig } from './MarbleSetup';
import { expandMarbles } from './marbleConfig';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('MarbleSetup', () => {
  it('저장된 설정과 구슬 순서를 그대로 복구한다', async () => {
    const user = userEvent.setup();
    const initialConfig: MarbleGameConfig = {
      participants: [
        { id: 'a', name: '짱구', count: 2 },
        { id: 'b', name: '철수', count: 1 },
      ],
      winnerMode: 'last',
      skillsEnabled: true,
      shuffledMarbles: [
        { id: 'a:1', participantId: 'a', name: '짱구' },
        { id: 'b:0', participantId: 'b', name: '철수' },
        { id: 'a:0', participantId: 'a', name: '짱구' },
      ],
    };
    const onStart = vi.fn<(config: MarbleGameConfig) => void>();

    render(<MarbleSetup initialConfig={initialConfig} onStart={onStart} random={() => 0.99} />);

    expect(screen.getByLabelText('참가자 1 이름')).toHaveValue('짱구');
    expect(screen.getByLabelText('참가자 1 구슬 수')).toHaveValue(2);
    expect(screen.getByRole('radio', { name: '마지막' })).toBeChecked();
    expect(screen.getByRole('switch', { name: '스킬 사용' })).toBeChecked();

    await user.click(screen.getByRole('button', { name: '레이스 시작' }));

    expect(onStart).toHaveBeenCalledWith(initialConfig);
  });

  it('3명 이상 저장 설정을 복구한 뒤에도 중복 없는 참가자와 구슬 ID를 발급한다', async () => {
    const user = userEvent.setup();
    const initialConfig: MarbleGameConfig = {
      participants: [
        { id: 'restored-form-participant-1', name: '짱구', count: 1 },
        { id: 'marble-form-participant-3', name: '철수', count: 1 },
        { id: 'marble-form-participant-4', name: '유리', count: 1 },
      ],
      winnerMode: 'first',
      skillsEnabled: false,
      shuffledMarbles: [
        { id: 'restored-form-participant-1:0', participantId: 'restored-form-participant-1', name: '짱구' },
        { id: 'marble-form-participant-3:0', participantId: 'marble-form-participant-3', name: '철수' },
        { id: 'marble-form-participant-4:0', participantId: 'marble-form-participant-4', name: '유리' },
      ],
    };
    const onStart = vi.fn<(config: MarbleGameConfig) => void>();
    const firstRender = render(<MarbleSetup initialConfig={initialConfig} onStart={() => {}} />);
    firstRender.unmount();

    render(<MarbleSetup initialConfig={initialConfig} onStart={onStart} random={() => 0.99} />);
    await user.click(screen.getByRole('button', { name: '참가자 추가' }));
    await user.type(screen.getByLabelText('참가자 4 이름'), '맹구');
    await user.click(screen.getByRole('button', { name: '레이스 시작' }));

    const startedConfig = onStart.mock.calls[0]?.[0];
    const participantIds = startedConfig?.participants.map(({ id }) => id) ?? [];
    const expandedSeedIds = expandMarbles(startedConfig?.participants ?? []).map(({ id }) => id);
    const seedIds = startedConfig?.shuffledMarbles.map(({ id }) => id) ?? [];
    expect(onStart).toHaveBeenCalledOnce();
    expect(participantIds).toHaveLength(4);
    expect(new Set(participantIds).size).toBe(participantIds.length);
    expect(new Set(expandedSeedIds).size).toBe(expandedSeedIds.length);
    expect(seedIds).toHaveLength(4);
    expect(new Set(seedIds).size).toBe(seedIds.length);
    expect(participantIds.at(-1)).toBe('marble-form-participant-5');
  });

  it('시작 전 설정 변경과 현재 섞인 순서를 알린다', async () => {
    const user = userEvent.setup();
    const changes: MarbleGameConfig[] = [];

    render(<MarbleSetup onStart={() => {}} onConfigChange={(config) => changes.push(config)} random={() => 0} />);

    await user.type(screen.getByLabelText('참가자 1 이름'), '짱구');
    await user.click(screen.getByRole('radio', { name: '마지막' }));
    await user.click(screen.getByRole('switch', { name: '스킬 사용' }));
    await user.click(screen.getByRole('button', { name: '구슬 섞기' }));

    expect(changes.at(-1)).toMatchObject({ winnerMode: 'last', skillsEnabled: true });
    expect(changes.at(-1)?.participants[0]?.name).toBe('짱구');
    expect(changes.at(-1)?.shuffledMarbles).toHaveLength(2);
  });

  it('구슬 한 개씩 가진 빈 참가자 두 명으로 시작한다', () => {
    render(<MarbleSetup onStart={() => {}} />);

    expect(screen.getByLabelText('참가자 1 이름')).toHaveValue('');
    expect(screen.getByLabelText('참가자 2 이름')).toHaveValue('');
    expect(screen.getByLabelText('참가자 1 구슬 수')).toHaveValue(1);
    expect(screen.getByLabelText('참가자 2 구슬 수')).toHaveValue(1);
    expect(screen.getByRole('status', { name: '전체 구슬 수' })).toHaveTextContent('총 2개');
    expect(screen.getByRole('button', { name: '레이스 시작' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '참가자 1 삭제' })).toBeDisabled();
  });

  it('참가자를 추가하고 기존 ID를 유지한 채 원하는 행을 삭제한다', async () => {
    const user = userEvent.setup();
    const onStart = vi.fn<(config: MarbleGameConfig) => void>();
    render(<MarbleSetup onStart={onStart} random={() => 0.99} />);

    await user.type(screen.getByLabelText('참가자 1 이름'), '짱구');
    await user.type(screen.getByLabelText('참가자 2 이름'), '철수');
    await user.click(screen.getByRole('button', { name: '참가자 추가' }));
    await user.type(screen.getByLabelText('참가자 3 이름'), '유리');
    await user.click(screen.getByRole('button', { name: '참가자 2 삭제' }));
    await user.click(screen.getByRole('button', { name: '레이스 시작' }));

    const config = onStart.mock.calls[0]?.[0];
    expect(config?.participants.map(({ name }) => name)).toEqual(['짱구', '유리']);
    expect(new Set(config?.participants.map(({ id }) => id)).size).toBe(2);
    expect(config?.shuffledMarbles.map(({ participantId }) => participantId))
      .toEqual(config?.participants.map(({ id }) => id));
  });

  it('개수를 1~100에서 조절하고 전체 101개면 줄일 개수와 비활성 상태를 알린다', async () => {
    const user = userEvent.setup();
    render(<MarbleSetup onStart={() => {}} />);

    await user.type(screen.getByLabelText('참가자 1 이름'), '짱구');
    await user.type(screen.getByLabelText('참가자 2 이름'), '철수');
    await user.clear(screen.getByLabelText('참가자 1 구슬 수'));
    await user.type(screen.getByLabelText('참가자 1 구슬 수'), '100');

    expect(screen.getByRole('status', { name: '전체 구슬 수' })).toHaveTextContent('총 101개');
    expect(screen.getByText('1개 줄여 주세요')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '레이스 시작' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '참가자 1 구슬 증가' })).toBeDisabled();

    await user.click(screen.getByRole('button', { name: '참가자 1 구슬 감소' }));
    expect(screen.getByLabelText('참가자 1 구슬 수')).toHaveValue(99);
    expect(screen.queryByText('1개 줄여 주세요')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '레이스 시작' })).toBeEnabled();
  });

  it('첫 번째·마지막 판정과 스킬 사용을 설정한다', async () => {
    const user = userEvent.setup();
    const onStart = vi.fn<(config: MarbleGameConfig) => void>();
    render(<MarbleSetup onStart={onStart} random={() => 0.99} />);

    await user.type(screen.getByLabelText('참가자 1 이름'), '짱구');
    await user.type(screen.getByLabelText('참가자 2 이름'), '철수');
    await user.click(screen.getByRole('radio', { name: '마지막' }));
    await user.click(screen.getByRole('switch', { name: '스킬 사용' }));
    await user.click(screen.getByRole('button', { name: '레이스 시작' }));

    expect(onStart).toHaveBeenCalledWith(expect.objectContaining({
      winnerMode: 'last',
      skillsEnabled: true,
    }));
  });

  it('입력 변경은 구슬을 다시 만들고 섞기는 config를 유지한 채 현재 순서만 바꾼다', async () => {
    const user = userEvent.setup();
    const configs: MarbleGameConfig[] = [];
    render(<MarbleSetup onStart={(config) => configs.push(config)} random={() => 0} />);

    await user.type(screen.getByLabelText('참가자 1 이름'), '짱구');
    await user.type(screen.getByLabelText('참가자 2 이름'), '철수');
    await user.click(screen.getByRole('button', { name: '참가자 1 구슬 증가' }));
    await user.click(screen.getByRole('button', { name: '레이스 시작' }));
    await user.click(screen.getByRole('button', { name: '구슬 섞기' }));
    await user.click(screen.getByRole('button', { name: '레이스 시작' }));

    expect(configs).toHaveLength(2);
    expect(configs[1]?.participants).toEqual(configs[0]?.participants);
    expect(configs[1]?.winnerMode).toBe(configs[0]?.winnerMode);
    expect(configs[1]?.skillsEnabled).toBe(configs[0]?.skillsEnabled);
    expect(configs[1]?.shuffledMarbles.map(({ id }) => id))
      .not.toEqual(configs[0]?.shuffledMarbles.map(({ id }) => id));
  });

  it('시작할 때 이름 공백을 제거하되 확정된 구슬 배열을 다시 만들지 않는다', async () => {
    const user = userEvent.setup();
    const configs: MarbleGameConfig[] = [];
    render(<MarbleSetup onStart={(config) => configs.push(config)} random={() => 0.99} />);

    await user.type(screen.getByLabelText('참가자 1 이름'), '  짱구  ');
    await user.type(screen.getByLabelText('참가자 2 이름'), '철수');
    await user.click(screen.getByRole('button', { name: '레이스 시작' }));
    await user.click(screen.getByRole('button', { name: '레이스 시작' }));

    expect(configs[0]?.participants[0]?.name).toBe('짱구');
    expect(configs[0]?.shuffledMarbles[0]?.name).toBe('짱구');
    expect(configs[1]?.shuffledMarbles).toBe(configs[0]?.shuffledMarbles);
  });
});
