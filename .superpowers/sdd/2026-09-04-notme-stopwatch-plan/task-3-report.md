# Task 3 보고서: 설정·플레이·결과 화면

## 디자인 계획

- 색: 기존 `#1b1715` 배경, `#29221e` 표면, `#fff7eb` 본문, `#9c8d82` 보조, `#ffb55e` 주요 행동을 그대로 사용한다.
- 서체: 기존 Inter/Pretendard 계열을 유지하고, 타이머에만 큰 tabular-number 숫자 조형을 사용한다.
- 배치: 설정은 편집 가능한 참가자 행 목록 → 추가 → 시작, 플레이는 라운드/현재 이름 → 측정 차수 → `MM:SS.hh` → 대형 시작·멈추기 → 저장 숫자/곱, 결과는 선택자 → 전체 점수 순서로 놓는다. 모든 내용은 기존 최대 720px 쉘 안에서 왼쪽 정렬하되 타이머와 주요 버튼은 중앙 정렬한다.
- 원칙: 320px에서 가로 넘침이 없고, 모든 조작은 44px 이상이며, 기존 `focus-visible` 표시를 유지한다. 기억에 남는 요소는 타이머 하나로 제한한다.

### 기존 UI와의 일관성 자체 비평

기존 홈과 `GameShell`은 짙은 배경, 단일 표면색, 작은 모서리 반경과 간결한 목록으로 계층을 만든다. 스톱워치 화면도 이 문법을 따라 중첩 카드를 두지 않고 구분선과 여백으로 상태를 구분한다. 큰 숫자와 주황색 대형 버튼을 동시에 강조하면 경쟁하므로, 숫자를 조형적 초점으로 두고 버튼은 색만 계승한다. 그라디언트·새 폰트·자동 장식 모션은 제외한다.

## RED/GREEN

- RED 1: `npm test -- src/features/stopwatch/StopwatchPage.test.tsx`에서 `./StopwatchPage` 모듈을 찾지 못해 테스트 스위트가 실패했다.
- GREEN 1: 설정에서 두 참가자를 입력하고 첫 측정 화면으로 진입하는 최소 구현 후 테스트 1개가 통과했다.
- RED 2: 참가자 행 추가·삭제 테스트가 `참가자 추가` 버튼 부재로 실패했다. 행 편집을 추가한 뒤 화면 테스트 4개가 통과했다.
- RED 3: rAF 표시 갱신과 stop 시점의 `performance.now()` 재독 테스트가 타이머 표시 부재로 실패했다. 프레임에서 `00:00.23`을 표시하고 stop 순간 `00:00.29`의 끝자리 9를 저장하도록 구현한 뒤 5개가 통과했다.
- RED 4: 선택자·전체 점수, 동점 재대결, `다시 하기` 테스트 3개가 결과/안내 UI 부재로 실패했다. 현재 라운드의 최저점 선택자와 전체 점수를 렌더링하고 `clearDraft('stopwatch')`를 연결한 뒤 8개가 통과했다.
- RED 5: 입력 검증, 실제 라우트, 공백만 입력한 설정의 `dirty` 경계 테스트가 각각 기대한 이유로 실패했다. 버튼 활성화·trim, `/stopwatch` 마운트, 입력 유무 기반 `dirty`를 적용한 뒤 화면 테스트 10개와 App 테스트 15개가 통과했다.

## 명령 결과

- `npm test -- src/features/stopwatch src/app/App.test.tsx`: 4개 테스트 파일, 43개 테스트 통과
- `npm test`: 8개 테스트 파일, 62개 테스트 통과
- `npm run typecheck`: 통과
- `npm run build`: 통과, Vite/PWA 생성 완료
- `git diff --check`: 통과

## 변경 파일

- `src/features/stopwatch/StopwatchPage.tsx`
- `src/features/stopwatch/StopwatchPage.test.tsx`
- `src/features/stopwatch/stopwatch.css`
- `src/app/App.tsx`
- `src/app/App.test.tsx`
- `.superpowers/sdd/2026-09-04-notme-stopwatch-plan/task-3-report.md`

## 자체 리뷰

- 상태 전이는 기존 `stopwatchReducer`에 위임하고, 화면은 입력·시간 이벤트와 렌더링만 담당한다.
- 실행 중 표시는 `requestAnimationFrame`에서 갱신하며, 멈추기는 클릭 핸들러에서 `performance.now()`를 새로 읽어 reducer에 전달한다.
- `dirty`는 공백을 포함한 설정 입력 유무 또는 게임 상태 존재로 계산한다. `onReset`은 로컬 상태만 빈 설정으로 돌린다.
- 결과 선택자는 전체 점수가 아니라 현재 `roundPlayerIds`만 비교해 재대결 결과를 바르게 표시한다.
- 320px에서 설정 버튼을 세로로 배치하고, 입력·버튼은 기존 44px 최소 크기와 `focus-visible`을 계승한다. 자동 모션과 그라디언트는 추가하지 않았다.

## 우려

- 현재 세션에 사용 가능한 브라우저가 없어 320px·데스크톱 실제 스크린샷 검토는 하지 못했다. DOM과 CSS 수치로 가로 넘침·44 자체 검토했다.
- draft 초기 복구·상태 자동 저장·visibility 무효화·`GameShell` 초기화 시 draft 삭제는 preflight 결정대로 Task 4에 남겼다. Task 3에서는 `다시 하기`에만 `clearDraft('stopwatch')`를 연결했다.
