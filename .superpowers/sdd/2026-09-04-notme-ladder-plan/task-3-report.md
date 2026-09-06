# Task 3 보고서: SVG 사다리와 고정 경로 공개

## 디자인 계획

- 색상은 기존 웜 다크 토큰 `#3b302a` 기본선과 `#ffb55e` 활성 경로만 사용한다.
- 참가자와 결과를 72px 열에 맞추고, 이름·결과 버튼은 64px 너비에서 긴 문자열을 줄바꿈하며 최소 44px 높이를 갖는다.
- 사다리는 행당 44px로 수직 진행하고, 선택한 경로 polyline만 dash 애니메이션으로 공개한다.
- 보드 너비가 화면을 넘으면 `.ladder-board__scroll`만 가로로 이동하며, 외부 section은 `width: 100%`, `min-width: 0`으로 페이지 넘침을 막는다.
- SVG에 title·description을 분리해 제공하고, 공개된 결과는 색상에 의존하지 않고 실제 텍스트로 표시한다.

## 구조 스케치

```text
[참가자 버튼] [참가자 버튼] [참가자 버튼] ...
       │───│       │
       │   │───│
       │───│       │    ← 선택 경로만 주황색
[결과 버튼]   [?]      [?]
<---------- 보드 영역만 가로 이동 ---------->
```

## RED/GREEN

- RED: `npm test -- src/features/ladder/LadderBoard.test.tsx`를 실행했고, `LadderBoard` 모듈이 없어 import 해석 실패로 실패했다.
- 첫 GREEN 시도에서 클릭 index·고정 polyline·공개 결과 3개 계약은 통과했고, 접근 가능한 SVG 이름과 CSS 자산 로딩 2개가 실패했다.
- GREEN: SVG의 `aria-labelledby`와 `aria-describedby`를 분리하고 CSS 계약을 실제 파일에서 읽도록 수정한 뒤, 관련 테스트 5개와 typecheck가 통과했다.

## 검증 명령 결과

| 명령 | 결과 |
| --- | --- |
| `npm test -- src/features/ladder/LadderBoard.test.tsx` | 1개 파일, 5개 테스트 통과 |
| `npm test` | 11개 파일, 93개 테스트 통과 |
| `npm run typecheck` | 통과 |
| `npm run build` | 통과 |
| `git diff --check` | 통과 |

## 변경 파일

- `src/features/ladder/LadderBoard.tsx`
- `src/features/ladder/LadderBoard.test.tsx`
- `src/features/ladder/ladder.css`
- `.superpowers/sdd/2026-09-04-notme-ladder-plan/task-3-report.md`

## 자체 리뷰

- 기본 세로선과 가로선을 먼저 그린 뒤, `traceLadder`가 반환한 고정 지점을 별도 polyline으로 렌더링한다.
- 좌표는 `column * 72`, `row * 44`로 변환하고 viewBox에 좌우 36px·상하 22px 여백을 반영했다.
- `revealedStarts`를 각 도착 열의 시작 index와 대조하여 공개된 문자열만 DOM과 접근성 이름에 포함한다.
- 활성 경로와 결과는 동일 props 렌더에서 나타나며, `onAnimationEnd` 또는 내부 결과 상태가 없다.
- `prefers-reduced-motion: reduce`에서 animation을 제거하고 `stroke-dashoffset: 0`으로 즉시 표시한다.

## 우려

- Task 3은 `LadderBoard`를 라우트에 연결하지 않는 범위이므로, 실제 모바일 뷰포트에서의 시각 QA는 Task 4의 `LadderPage` 연결 후 필요하다.
- 컴포넌트는 `ladder.columnCount`, names, outcomes가 같은 수이며 사다리 링크가 유효하다는 상위 상태 계약을 소비한다.
