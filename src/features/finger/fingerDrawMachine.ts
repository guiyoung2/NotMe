export const COUNTDOWN_MS = 3_000;
const MAX_FINGERS = 10;
const FINGER_COLORS = ['#ffb55e', '#78d6c6', '#d5a6ff', '#ff8fa3', '#8eb8ff', '#d8c870', '#7edb9a', '#ffab70', '#c49cff', '#63c9d9'];

export type FingerDrawPhase = 'waiting' | 'countdown' | 'result';
export type CountdownReason = 'initial' | 'changed' | null;

export type Finger = {
  id: number;
  x: number;
  y: number;
  color: string;
};

export type FingerDrawState = {
  phase: FingerDrawPhase;
  fingers: Finger[];
  countdownStartedAt: number | null;
  countdownVersion: number;
  countdownReason: CountdownReason;
  selectedId: number | null;
};

export type FingerDrawAction =
  | { type: 'touch-start'; id: number; x: number; y: number; now: number }
  | { type: 'touch-move'; id: number; x: number; y: number }
  | { type: 'touch-end'; id: number; now: number }
  | { type: 'resolve'; version: number; selectedId: number }
  | { type: 'reset' };

export function createFingerDrawGame(): FingerDrawState {
  return {
    phase: 'waiting',
    fingers: [],
    countdownStartedAt: null,
    countdownVersion: 0,
    countdownReason: null,
    selectedId: null,
  };
}

export function fingerDrawReducer(state: FingerDrawState, action: FingerDrawAction): FingerDrawState {
  if (action.type === 'reset') return createFingerDrawGame();
  if (state.phase === 'result') return state;

  if (action.type === 'touch-move') {
    const finger = state.fingers.find(({ id }) => id === action.id);
    if (!finger) return state;

    return {
      ...state,
      fingers: state.fingers.map((current) => (
        current.id === action.id ? { ...current, x: action.x, y: action.y } : current
      )),
    };
  }

  if (action.type === 'touch-start') {
    if (state.fingers.some(({ id }) => id === action.id) || state.fingers.length >= MAX_FINGERS) return state;
    return updateFingerSet(state, [
      ...state.fingers,
      { id: action.id, x: action.x, y: action.y, color: FINGER_COLORS[state.fingers.length] },
    ], action.now);
  }

  if (action.type === 'touch-end') {
    if (!state.fingers.some(({ id }) => id === action.id)) return state;
    return updateFingerSet(state, state.fingers.filter(({ id }) => id !== action.id), action.now);
  }

  if (action.version !== state.countdownVersion
    || state.phase !== 'countdown'
    || !state.fingers.some(({ id }) => id === action.selectedId)) {
    return state;
  }

  return {
    ...state,
    phase: 'result',
    countdownStartedAt: null,
    countdownReason: null,
    selectedId: action.selectedId,
  };
}

function updateFingerSet(state: FingerDrawState, fingers: Finger[], now: number): FingerDrawState {
  if (fingers.length < 2) {
    return {
      ...state,
      phase: 'waiting',
      fingers,
      countdownStartedAt: null,
      countdownVersion: state.countdownVersion + 1,
      countdownReason: null,
      selectedId: null,
    };
  }

  return {
    ...state,
    phase: 'countdown',
    fingers,
    countdownStartedAt: now,
    countdownVersion: state.countdownVersion + 1,
    countdownReason: state.phase === 'countdown' ? 'changed' : 'initial',
    selectedId: null,
  };
}

export function pickFingerId(ids: number[], random: () => number): number {
  return ids[Math.floor(random() * ids.length)]!;
}
