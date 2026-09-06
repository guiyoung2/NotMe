# Task 2 보고서: 사다리 설정 화면

## 디자인 계획

- 색상은 기존 웜 다크 토큰 `#1b1715`, `#29221e`, `#3b302a`, `#fff7eb`, `#9c8d82`, `#ffb55e`를 재사용한다.
- 글꼴은 앱의 `Inter, Pretendard, system-ui` 스택을 유지하고, 사다리 수와 행 번호에는 tabular number를 써서 수량과 순서를 빠르게 읽게 한다.
- 상단에 `제거 — 현재 개수 — 추가`를 배치하고, 아래는 얇은 구분선으로 연결된 번호 목록으로 구성한다.
- 넓은 화면에서는 같은 번호의 참가자와 결과를 나란히 보이고, 480px 이하에서는 같은 행 안에서 세로로 쌓는다.
- 프리셋은 목록 보조 동작, 섞기는 순서 변경 동작, 게임 시작은 유일한 주요 CTA로 분리한다.
- 모든 입력은 고유 label과 `min-width: 0`, `max-width: 100%`를 갖고, 기존 44px 터치·`focus-visible` 규칙을 상속한다.

## 구조 스케치

```text
[참가자와 결과 설정]
[사다리 제거]       4개       [사다리 추가]

01  [참가자 1____________] [결과 1_______________]
02  [참가자 2____________] [결과 2_______________]

[벌칙 1개와 통과로 채우기]
[참가자와 결과 섞기]  [게임 시작]

320px:
01  [참가자 1____________]
    [결과 1_______________]
```

## 구현 전 자체 비평

- 각 행을 따로 카드화하면 기존 목록형 문법과 달라지고 작은 화면에서 장식이 데이터보다 커진다. 따라서 카드를 제거하고 구분선과 실제 순서를 뜻하는 행 번호만 남긴다.
- 사다리 수를 `+`/`−`만으로 표현하면 목적과 현재 상태가 모호하다. 버튼에 명시적 텍스트를 쓰고 중앙에 `n개`를 크게 표시한다.
- 모든 동작을 같은 그리드에 넣으면 의미 위계가 사라진다. 프리셋은 입력 목록 아래 단독으로, 섞기와 시작은 마지막 행에 두되 시작만 accent로 강조한다.

## RED/GREEN

- RED: `npm test -- src/features/ladder/LadderSetup.test.tsx`를 실행했고, 아직 `./LadderSetup` 모듈이 없어 import 해석 실패로 실패했다.
- GREEN: controlled 설정 컴포넌트와 반응형 스타일을 추가한 뒤 같은 명령에서 테스트 파일 1개, 테스트 6개가 통과했다.

## 검증 명령 결과

| 명령 | 결과 |
| --- | --- |
| `npm test -- src/features/ladder/LadderSetup.test.tsx` | 1개 파일, 6개 테스트 통과 |
| `npm test` | 10개 파일, 88개 테스트 통과 |
| `npm run typecheck` | 통과 |
| `npm run build` | 통과 |
| `git diff --check` | 통과 |

## 변경 파일

- `src/features/ladder/LadderSetup.tsx`
- `src/features/ladder/LadderSetup.test.tsx`
- `src/features/ladder/ladderSetup.css`
- `.superpowers/sdd/2026-09-04-notme-ladder-plan/task-2-report.md`

## 자체 리뷰

- 추가·제거는 하나의 `onChange`로 names와 outcomes를 같이 변경하며, 최소 2개 방어를 비활성 상태와 핸들러 모두에 두었다.
- 입력은 `useId`로 컴포넌트 인스턴스까지 구분되는 label·input 연결을 갖고, 같은 행 번호 안에 참가자와 결과를 묶었다.
- 섞기는 같은 동작 안에서 `shuffleWith`를 names와 outcomes에 각각 호출하여 두 순서를 독립적으로 변경한다.
- 시작 가능 조건은 최소 2개, 두 배열의 동일한 길이, 모든 항목의 비어 있지 않은 trim 값을 모두 확인한다.
- 480px 이하에서 입력을 세로로 쌓고 380px 이하에서 하단 동작도 세로로 쌓으며, 모든 grid 항목과 input에 넘침 방지 제약을 두었다.

## 우려

- 이 Task는 `LadderSetup`을 생성하지만 라우트에 연결하지 않는 범위라 실제 `LadderPage`에서의 시각 QA는 후속 Task 4에서 필요하다.
- 이 컴포넌트는 정상 흐름에서 names와 outcomes가 같은 길이라는 controlled 값 계약을 소비한다. 길이가 다른 값은 시작만 차단하며 자동으로 복구하지 않는다.
