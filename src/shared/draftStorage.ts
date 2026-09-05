export type GameId = 'stopwatch' | 'ladder' | 'marble';

const DRAFT_VERSION = 1;

const keyOf = (game: GameId) => `notme:draft:${game}`;

export function saveDraft<T>(game: GameId, payload: T): void {
  localStorage.setItem(keyOf(game), JSON.stringify({ version: DRAFT_VERSION, payload }));
}

export function loadDraft<T>(game: GameId, isPayload: (value: unknown) => value is T): T | null {
  const key = keyOf(game);
  const rawDraft = localStorage.getItem(key);

  if (rawDraft === null) {
    return null;
  }

  try {
    const draft: unknown = JSON.parse(rawDraft);

    if (
      typeof draft !== 'object' ||
      draft === null ||
      Array.isArray(draft) ||
      !('version' in draft) ||
      !('payload' in draft) ||
      draft.version !== DRAFT_VERSION ||
      !isPayload(draft.payload)
    ) {
      localStorage.removeItem(key);
      return null;
    }

    return draft.payload;
  } catch {
    localStorage.removeItem(key);
    return null;
  }
}

export function clearDraft(game: GameId): void {
  localStorage.removeItem(keyOf(game));
}
