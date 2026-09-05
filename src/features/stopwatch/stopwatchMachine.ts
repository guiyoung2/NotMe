import { lastHundredthDigit, lowestPlayerIds, multiplyDigits } from './stopwatchRules';

export type StopwatchPhase = 'playing' | 'result';

export type PlayerRun = {
  id: string;
  name: string;
  attempts: number[];
  score: number | null;
};

export type StopwatchState = {
  phase: StopwatchPhase;
  players: PlayerRun[];
  roundPlayerIds: string[];
  currentPlayerIndex: number;
  startedAt: number | null;
  round: number;
};

export type StopwatchAction =
  | { type: 'start'; now: number }
  | { type: 'stop'; now: number }
  | { type: 'invalidate-running-attempt' };

export function createStopwatchGame(names: string[]): StopwatchState {
  const players = names.map((name, index) => ({
    id: `player-${index}`,
    name,
    attempts: [],
    score: null,
  }));

  return {
    phase: 'playing',
    players,
    roundPlayerIds: players.map(({ id }) => id),
    currentPlayerIndex: 0,
    startedAt: null,
    round: 1,
  };
}

export function stopwatchReducer(state: StopwatchState, action: StopwatchAction): StopwatchState {
  if (state.phase !== 'playing') {
    return state;
  }

  if (action.type === 'start') {
    return state.startedAt === null ? { ...state, startedAt: action.now } : state;
  }

  if (action.type === 'invalidate-running-attempt') {
    return state.startedAt === null ? state : { ...state, startedAt: null };
  }

  if (state.startedAt === null) {
    return state;
  }

  const currentPlayer = state.players[state.currentPlayerIndex];
  const attempts = [...currentPlayer.attempts, lastHundredthDigit(action.now - state.startedAt)];
  const players = state.players.map((player, index) => (
    index === state.currentPlayerIndex
      ? { ...player, attempts, score: attempts.length === 2 ? multiplyDigits([attempts[0], attempts[1]]) : player.score }
      : player
  ));

  if (attempts.length < 2) {
    return { ...state, players, startedAt: null };
  }

  const nextPlayerIndex = state.players.findIndex(
    (player, index) => index > state.currentPlayerIndex && state.roundPlayerIds.includes(player.id),
  );

  if (nextPlayerIndex !== -1) {
    return { ...state, players, currentPlayerIndex: nextPlayerIndex, startedAt: null };
  }

  const lowestIds = lowestPlayerIds(state.roundPlayerIds.map((id) => {
    const player = players.find((candidate) => candidate.id === id);
    return { id, score: player?.score ?? 0 };
  }));

  if (lowestIds.length === 1) {
    return { ...state, phase: 'result', players, startedAt: null };
  }

  return {
    ...state,
    players: players.map((player) => (
      lowestIds.includes(player.id) ? { ...player, attempts: [], score: null } : player
    )),
    roundPlayerIds: lowestIds,
    currentPlayerIndex: players.findIndex((player) => player.id === lowestIds[0]),
    startedAt: null,
    round: state.round + 1,
  };
}

export function isStopwatchDraft(value: unknown): value is StopwatchState {
  if (!isRecord(value) || (value.phase !== 'playing' && value.phase !== 'result') || !Array.isArray(value.players)
    || !Array.isArray(value.roundPlayerIds) || !Number.isInteger(value.currentPlayerIndex)
    || !(typeof value.startedAt === 'number' || value.startedAt === null) || !Number.isInteger(value.round)) {
    return false;
  }

  return value.players.every(isPlayerRun) && value.roundPlayerIds.every((id) => typeof id === 'string');
}

function isPlayerRun(value: unknown): value is PlayerRun {
  return isRecord(value) && typeof value.id === 'string' && typeof value.name === 'string'
    && Array.isArray(value.attempts) && value.attempts.every((attempt) => typeof attempt === 'number')
    && (typeof value.score === 'number' || value.score === null);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
