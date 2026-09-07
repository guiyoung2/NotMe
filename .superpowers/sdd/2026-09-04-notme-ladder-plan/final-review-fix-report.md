# 사다리 final whole-branch review fix 보고서

기준 HEAD: `9f509ce927750f03fe073d6d0a2e2ce5b1087ed8`

## Finding 1 — 홈 이동 시 빈 구조 draft 삭제

- 원인: `GameShell`의 clean 홈 이동 분기는 `navigate('/')`만 실행해 `onReset()`을 건너뛰었다. 사다리 수만 늘린 setup draft는 저장되지만 문자열이 모두 비어 `dirty=false`여서 이 분기를 탔다.
- 변경: 실제 홈 이동 직전에 dirty 여부와 관계없이 `onReset()`을 호출한다. dirty 상태의 확인·취소 흐름과 초기화 흐름은 그대로 유지한다.
- 테스트: `GameShell` clean 이동에서 `onReset` 1회 호출을 검증하고, 실제 `/ladder`에서 빈 세 번째 행 추가 → 홈 이동 → draft 삭제 → 재진입 시 참가자·결과 각각 빈 두 칸 복구를 통합 검증한다.
- RED: `npm test -- src/app/GameShell.test.tsx src/app/App.test.tsx`에서 새 테스트 2개가 각각 `onReset` 0회와 draft 잔존으로 실패했다.
- GREEN: 같은 명령에서 2개 파일, 24개 테스트가 통과했다.

## Finding 2 — 공개 결과 polite live status

- 변경: 진행 화면에 미리 마운트된 시각적 숨김 `role="status" aria-live="polite"` 영역을 두었다.
- 개별 공개: 고정 사다리를 추적해 `참가자: 결과`를 알린다.
- 전체 공개: 모든 고정 매핑을 `전체 결과: 참가자: 결과, ...` 형식으로 알린다.
- RED: `npm test -- src/features/ladder/LadderPage.test.tsx`에서 새 테스트가 status 부재로 실패했다.
- GREEN: 같은 명령에서 1개 파일, 33개 테스트가 통과했다.

## Finding 3 — 재생을 약속하지 않는 접근성 이름

- 변경: 공개된 결과 버튼의 `경로 다시 보기`를 `경로 보기`로 바꿨다. 참가자와 결과 버튼 모두 현재 경로는 기존 `aria-pressed="true"`로 선택 상태를 전달하며, 실제로 구현되지 않은 replay 동작을 이름으로 약속하지 않는다.
- RED: `npm test -- src/features/ladder/LadderBoard.test.tsx`에서 `꽝 경로 보기`를 찾지 못하고 실제 `꽝 경로 다시 보기`가 노출되어 실패했다.
- GREEN: 관련 4개 테스트 파일의 64개 테스트가 통과했다.

## 검증 결과

| 명령 | 결과 |
| --- | --- |
| `npm test -- src/features/ladder src/shared src/app` | 8개 파일, 89개 테스트 통과 |
| `npm test` | 12개 파일, 130개 테스트 통과 |
| `npm run typecheck` | 통과 |
| `npm run build` | 통과, Vite production bundle 및 PWA service worker 생성 |
| `git diff --check` | 통과 |

## 남은 우려

- 320px 실제 viewport의 `scrollWidth`, 페이지 넘침, 보드 전용 가로 스크롤은 코드 기반 가짜 계측을 추가하지 않았다. release 브라우저 QA에서 실제 레이아웃으로 확인해야 한다.
- 실제 스크린리더별 발표 문장과 타이밍은 release 접근성 QA에서 확인한다. 자동 테스트는 live region의 역할·polite 속성과 개별·전체 문구 전이를 검증한다.
