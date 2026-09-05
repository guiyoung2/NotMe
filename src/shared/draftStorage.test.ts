import { afterEach, describe, expect, it } from 'vitest';
import { clearDraft, loadDraft, saveDraft } from './draftStorage';

const isNamesDraft = (value: unknown): value is { names: string[] } =>
  typeof value === 'object' &&
  value !== null &&
  Array.isArray((value as { names?: unknown }).names);

const isAnyPayload = (_value: unknown): _value is unknown => true;

describe('draftStorage', () => {
  afterEach(() => {
    localStorage.clear();
  });

  it('버전이 맞는 현재 판을 복구한다', () => {
    saveDraft('stopwatch', { names: ['짱구', '철수'] });

    expect(loadDraft('stopwatch', isNamesDraft)).toEqual({ names: ['짱구', '철수'] });
  });

  it('손상된 데이터는 삭제하고 null을 반환한다', () => {
    localStorage.setItem('notme:draft:ladder', '{broken');

    expect(loadDraft('ladder', isAnyPayload)).toBeNull();
    expect(localStorage.getItem('notme:draft:ladder')).toBeNull();
  });

  it('다른 버전의 현재 판은 삭제하고 null을 반환한다', () => {
    localStorage.setItem('notme:draft:marble', JSON.stringify({ version: 2, payload: {} }));

    expect(loadDraft('marble', isAnyPayload)).toBeNull();
    expect(localStorage.getItem('notme:draft:marble')).toBeNull();
  });

  it.each([
    ['null', 'null'],
    ['배열', '[]'],
    ['payload가 없는 객체', JSON.stringify({ version: 1 })],
  ])('%s 형태의 현재 판은 삭제하고 null을 반환한다', (_description, rawDraft) => {
    localStorage.setItem('notme:draft:marble', rawDraft);

    expect(loadDraft('marble', isAnyPayload)).toBeNull();
    expect(localStorage.getItem('notme:draft:marble')).toBeNull();
  });

  it('payload 검증에 실패한 현재 판은 삭제하고 null을 반환한다', () => {
    localStorage.setItem('notme:draft:stopwatch', JSON.stringify({ version: 1, payload: {} }));

    expect(loadDraft('stopwatch', isNamesDraft)).toBeNull();
    expect(localStorage.getItem('notme:draft:stopwatch')).toBeNull();
  });

  it('지정한 게임의 현재 판만 삭제한다', () => {
    saveDraft('stopwatch', { names: ['짱구'] });
    saveDraft('ladder', { names: ['철수'] });

    clearDraft('stopwatch');

    expect(localStorage.getItem('notme:draft:stopwatch')).toBeNull();
    expect(loadDraft('ladder', isNamesDraft)).toEqual({ names: ['철수'] });
  });
});
