# Task 1 보고서: 사다리 생성과 경로 추적

## RED/GREEN

- RED: `npm test -- src/features/ladder/ladderRules.test.ts`를 실행했고, 아직 `ladderRules` 모듈이 없어 import 해석 실패로 실패했다.
- GREEN: 최소 구현 후 같은 명령을 다시 실행했고 테스트 파일 1개, 테스트 4개가 통과했다.

## Fix round 1 RED/GREEN

- RED: 최소 2 열 제약을 검증하는 테스트를 추가한 뒤 `npm test -- src/features/ladder/ladderRules.test.ts`를 실행했다. 1·0·음수·비정수 입력 4개가 예외 없이 생성되어 실패했다.
- GREEN: `generateLadder` 시작 시 2 이상 정수만 통과시키는 `RangeError` 검증을 추가했고, 같은 명령에서 테스트 9개가 통과했다.

## 검증 명령 결과

| 명령 | 결과 |
| --- | --- |
| `npm test -- src/features/ladder/ladderRules.test.ts` | 1개 파일, 4개 테스트 통과 |
| `npm test` | 9개 파일, 77개 테스트 통과 |
| `npm run typecheck` | 통과 |
| `npm run build` | 통과 |
| `git diff --check` | 통과 |

## 변경 파일

- `src/features/ladder/ladderRules.ts`
- `src/features/ladder/ladderRules.test.ts`
- `.superpowers/sdd/2026-09-04-notme-ladder-plan/task-1-report.md`

## 자체 리뷰

- 생성은 각 행에서 바로 앞 가로선의 오른쪽 인접 위치를 막아 같은 행의 겹침·인접을 방지한다.
- 경로 추적은 각 행의 세로 진행점과 가로 이동 전후 지점을 모두 반환하므로 SVG polyline이 대각선으로 연결되지 않는다.
- 각 가로선은 인접 두 열만 교환하므로 모든 시작점의 도착점은 전단사이며, 테스트로 확인했다.
- 섞기는 입력 배열을 복사하고 뒤에서 앞으로 Fisher–Yates 교환을 수행한다.
- `generateLadder`는 최소 사다리 수 제약을 함수 경계에서 강제하며, 2열은 정상적으로 생성한다.

## 우려

- 시작 열, 난수 반환값, 외부에서 구성한 `Ladder`의 링크 유효성은 이 Task의 요구 범위에 포함되지 않아 별도 검증하지 않았다.
