# Task 4 보고서: 사다리 페이지 상태와 복구

## 디자인 계획

- 기존 웜 다크 토큰과 설정 목록·보드 표현을 그대로 사용하고 새 색상이나 장식 체계는 추가하지 않는다.
- 진행 화면은 짧은 사용 안내, 보드, `전체 결과 보기` 단일 CTA 순서로 구성한다.
- 페이지와 진행 section은 `width: 100%`, `min-width: 0`으로 축소하고, 넓은 판은 기존 `.ladder-board__scroll` 안에서만 가로 이동한다.
- 참가자·결과의 긴 문자열은 기존 endpoint의 `overflow-wrap: anywhere`로 보호하고 CTA 아래에는 safe-area 여백을 둔다.

## RED/GREEN

- RED: `npm test -- src/features/ladder/LadderPage.test.tsx`를 실행했고, 아직 `LadderPage` 모듈이 없어 import 해석 실패로 실패했다.
- RED: `npm test -- src/app/App.test.tsx`를 실행했고, 실제 `/ladder`가 placeholder여서 `참가자 1` 입력을 찾지 못해 16개 중 새 통합 테스트 1개가 실패했다.
- GREEN: 상태·판별·저장·복구와 실제 라우트를 연결한 뒤 두 테스트 파일의 43개 테스트가 통과했다.

## Fix round 1 RED/GREEN

- 리뷰 원인 1: validator가 각 row의 내부만 검사해 빈 배열도 `every`를 통과했고, 생성기의 `Math.max(6, columnCount * 2)` 행 개수와 복구 계약이 분리돼 있었다.
- 리뷰 원인 2: type guard가 필요한 필드만 구조적으로 확인해 `activeStart` 같은 extra key를 허용했고, 복구된 객체를 spread하는 공개 저장 경로가 그 key를 다시 영속화할 수 있었다.
- RED: 실제 행 개수로 정상 fixture를 정정하고 빈·1개 부족·1개 초과 rows 및 extra key를 추가한 뒤 `npm test -- src/features/ladder/LadderPage.test.tsx`를 실행했다. 32개 중 해당 5개 테스트가 실패했다.
- 첫 GREEN: `ladderRowCount`를 생성 규칙에 두고 generator와 validator가 같이 사용하도록 수정했다. 사다리 규칙을 포함한 관련 테스트에서 행 개수 3건은 통과하고 extra key 2건만 실패했다.
- GREEN: top-level key를 `phase`, `names`, `outcomes`, `ladder`, `revealedStarts` 다섯 개로 엄격히 제한했다. 관련 2개 파일의 41개 테스트가 모두 통과했고, `activeStart`가 있는 draft는 삭제된 뒤 다시 저장되지 않았다.

## 구현 내용

- 초기 상태는 참가자와 결과 각각 빈 값 2개인 setup draft다.
- 설정 변경, 게임 시작, 개별 공개, 전체 공개 이벤트에서 완성된 `LadderDraft`를 즉시 저장한다. 초기화는 effect에 의해 빈 draft가 다시 생기지 않도록 저장소 삭제와 메모리 상태 초기화만 수행한다.
- 시작 시 참가자와 결과를 trim하고 `generateLadder(names.length, Math.random)`을 한 번 호출해 저장된 판을 이후 렌더와 복구에서 재사용한다.
- 개별 공개는 중복 없는 start index를 즉시 저장하고, 전체 공개는 모든 start index를 저장한다. `activeStart`는 화면 애니메이션 상태로만 유지한다.
- 판별자는 정확한 top-level 다섯 필드, 최소 2개, 배열 길이 일치, playing 값의 비어 있지 않은 trim 값, phase별 ladder 존재 여부, columnCount, 생성기와 공유하는 row 개수, link 정수·범위·비인접, reveal index 정수·범위·유일성을 확인한다. setup의 빈 문자열은 허용한다.
- `/ladder` placeholder를 `LadderPage`로 교체하고 실제 라우트에서 설정 → 개별 공개 → 전체 공개 → 초기화 흐름을 검증한다.

## 검증 명령 결과

| 명령 | 결과 |
| --- | --- |
| `npm test -- src/features/ladder src/shared src/app` | 8개 파일, 86개 테스트 통과 |
| `npm test` | 12개 파일, 127개 테스트 통과 |
| `npm run typecheck` | 통과 |
| `npm run build` | 통과 |
| `git diff --check` | 통과 |

## 변경 파일

- `src/features/ladder/LadderPage.tsx`
- `src/features/ladder/LadderPage.test.tsx`
- `src/features/ladder/ladder.css`
- `src/app/App.tsx`
- `src/app/App.test.tsx`
- `.superpowers/sdd/2026-09-04-notme-ladder-plan/task-4-report.md`

## 자체 리뷰

- 공개 결과는 클릭 handler의 같은 상태 전이에서 활성 경로와 함께 나타나며 animation end 이벤트에 의존하지 않는다.
- 모든 persisted payload는 계획의 다섯 필드만 가지며 `activeStart`를 포함하지 않는다.
- 생성기와 validator는 동일한 `ladderRowCount`를 사용하므로 열 수에 따른 행 개수 규칙이 서로 달라지지 않는다.
- 손상된 판은 `loadDraft`의 판별 실패 경로에서 삭제된 뒤 빈 setup으로 복구되어 `LadderBoard`에 전달되지 않는다.
- dirty는 설정 문자열 중 하나라도 길이가 있거나 phase가 playing인 경우에만 true이며, 공백 입력도 편집 중 설정으로 취급한다.
- Task 3에서 유예된 live status와 `경로 다시 보기` 레이블은 이 Task에서 변경하지 않았다.

## 우려

- 현재 실행 환경에 연결 가능한 브라우저가 없어 320px 실제 viewport 스크린샷·scrollWidth 계측은 수행하지 못했다. 대신 Testing Library 실제 라우트 흐름과 CSS 파일의 축소·보드 전용 스크롤·긴 문자열·safe-area 계약을 자동 테스트한다.
