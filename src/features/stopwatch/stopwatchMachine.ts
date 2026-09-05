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
  if (!isStopwatchStateShape(value) || value.round < 1 || value.players.length < 2
    || !hasUniqueIds(value.players) || value.roundPlayerIds.length < 2
    || !hasUniqueValues(value.roundPlayerIds)) {
    return false;
  }

  const playerIds = new Set(value.players.map(({ id }) => id));
  if (!value.roundPlayerIds.every((id) => typeof id === 'string' && playerIds.has(id))
    || value.currentPlayerIndex < 0 || value.currentPlayerIndex >= value.players.length
    || !value.roundPlayerIds.includes(value.players[value.currentPlayerIndex].id)
    || !hasRoundPlayerOrder(value.players, value.roundPlayerIds)) {
    return false;
  }

  return value.phase === 'result'
    ? value.startedAt === null && value.players.every(isFinishedPlayer)
    : isValidPlayingState(value);
}

function isStopwatchStateShape(value: unknown): value is StopwatchState {
  return isRecord(value) && (value.phase === 'playing' || value.phase === 'result')
    && isPlayerRuns(value.players) && isStringArray(value.roundPlayerIds)
    && Number.isInteger(value.currentPlayerIndex)
    && (typeof value.startedAt === 'number' && Number.isFinite(value.startedAt) || value.startedAt === null)
    && Number.isInteger(value.round);
}

function isPlayerRun(value: unknown): value is PlayerRun {
  return isRecord(value) && typeof value.id === 'string' && typeof value.name === 'string'
    && Array.isArray(value.attempts) && value.attempts.length <= 2
    && value.attempts.every((attempt) => Number.isInteger(attempt) && attempt >= 0 && attempt <= 9)
    && (value.attempts.length === 2
      ? value.score === multiplyDigits([value.attempts[0], value.attempts[1]])
      : value.score === null);
}

function isPlayerRuns(value: unknown): value is PlayerRun[] {
  return Array.isArray(value) && value.every(isPlayerRun);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function hasUniqueIds(players: PlayerRun[]): boolean {
  return hasUniqueValues(players.map(({ id }) => id));
}

function hasUniqueValues(values: string[]): boolean {
  return new Set(values).size === values.length;
}

function hasRoundPlayerOrder(players: PlayerRun[], roundPlayerIds: string[]): boolean {
  const playerOrder = players
    .filter(({ id }) => roundPlayerIds.includes(id))
    .map(({ id }) => id);

  return playerOrder.every((id, index) => id === roundPlayerIds[index]);
}

function isFinishedPlayer(player: PlayerRun): boolean {
  return player.attempts.length === 2;
}

function isValidPlayingState(state: StopwatchState): boolean {
  return state.players.every((player, index) => {
    if (!state.roundPlayerIds.includes(player.id)) {
      return isFinishedPlayer(player);
    }

    if (index < state.currentPlayerIndex) {
      return isFinishedPlayer(player);
    }

    if (index === state.currentPlayerIndex) {
      return player.attempts.length < 2;
    }

    return player.attempts.length === 0;
  });
}
