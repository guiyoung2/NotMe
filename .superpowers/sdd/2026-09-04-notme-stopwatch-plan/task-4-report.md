# Task 4 보고서: 복구와 백그라운드 무효화

## RED/GREEN

- RED 1: `npm test -- src/features/stopwatch/StopwatchPage.test.tsx`에서 16개 중 6개가 실패했다. 자동 저장이 없어 초기화·홈 삭제 테스트의 저장 전제가 충족되지 않았고, 유효 draft 복구·손상 draft 삭제·`startedAt` 제거 직렬화·visibility 취소 안내가 각각 구현 부재로 실패했다.
- RED 2: 초기 draft 로드를 eager initializer로 변이한 뒤 단일 회귀 테스트를 실행했다. 렌더 갱신 뒤 `localStorage.getItem`이 1회가 아니라 2회 호출되어 기대한 이유로 실패했다.
- GREEN: lazy initializer로 유효 draft를 한 번 복구하고, 상태 저장 시 `startedAt: null` 복사본만 직렬화했다. 숨김 전환에서 실행 중 시도를 reducer action으로 무효화하고 안내를 표시했으며, 공통 reset 경로에서 draft와 로컬 판 상태를 함께 삭제했다. 대상 파일 17개 테스트가 모두 통과했다.

## 명령 결과

- `npm test -- src/features/stopwatch/StopwatchPage.test.tsx`: 1개 테스트 파일, 17개 테스트 통과
- `npm test -- src/features/stopwatch src/shared src/app`: 7개 테스트 파일, 68개 테스트 통과
- `npm test`: 8개 테스트 파일, 69개 테스트 통과
- `npm run typecheck`: 통과
- `npm run build`: 통과, Vite/PWA 생성 완료
- `git diff --check`: 통과

## 변경 파일

- `src/features/stopwatch/StopwatchPage.tsx`
- `src/features/stopwatch/StopwatchPage.test.tsx`
- `.superpowers/sdd/2026-09-04-notme-stopwatch-plan/task-4-report.md`

## 자체 리뷰

- 초기 draft는 `useState` lazy initializer에서 `loadDraft('stopwatch', isStopwatchDraft)`로 한 번만 읽는다. 설정 입력은 복구하지 않는다.
- 게임 상태가 바뀔 때 원본 메모리 상태는 유지하고 저장 payload만 `{ ...game, startedAt: null }`로 만들어, 실행 중 화면 동작과 새로고침 후 정지 복구를 분리했다.
- `visibilitychange`는 문서가 `hidden`이고 실제 `startedAt`이 있을 때만 `invalidate-running-attempt`를 보낸다. 취소 시 표시 시간을 0으로 돌리고 명확한 재시작 안내를 노출한다.
- `GameShell.onReset`이 호출하는 `reset`에서 draft와 판 상태를 함께 삭제한다. 따라서 초기화 확인과 홈 종료 확인이 같은 경로를 사용하고, 결과 화면의 다시 하기도 같은 reset 경로를 재사용한다.
- 변경은 Task 4의 화면과 화면 테스트, 보고서에만 한정했다.

## 우려

- visibility 동작은 jsdom에서 `document.visibilityState`와 이벤트를 실제 브라우저 계약대로 모사해 검증했다. 실제 모바일 브라우저별 백그라운드 전환 시각 차이는 자동화 범위 밖이다.
