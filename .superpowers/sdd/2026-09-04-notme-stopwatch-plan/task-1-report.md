# Task 1 보고서: 점수와 동점 규칙

## RED/GREEN

- RED: `npm test -- src/features/stopwatch/stopwatchRules.test.ts` 실행 결과, 아직 `./stopwatchRules` 모듈이 없어 import 해석 오류로 실패했다.
- GREEN: 최소 구현 후 동일 명령에서 테스트 6개가 모두 통과했다.

## 명령 결과

- `npm test -- src/features/stopwatch/stopwatchRules.test.ts`: 1개 테스트 파일, 6개 테스트 통과
- `npm run typecheck`: 통과
- `npm run build`: 통과
- `git diff --check`: 통과

## 변경 파일

- `src/features/stopwatch/stopwatchRules.ts`
- `src/features/stopwatch/stopwatchRules.test.ts`

## 자체 리뷰

- `lastHundredthDigit`는 음수 시간을 0으로 보정한 뒤 10ms 단위의 마지막 숫자를 반환한다.
- `multiplyDigits`는 정확히 두 자리 입력을 곱한다.
- `lowestPlayerIds`는 최소 점수 참가자 전원을 입력 순서대로 반환해 동점을 보존한다.
- 참가자 최소 인원 검증이나 UI 상태는 순수 함수 범위 밖이므로 추가하지 않았다.

## 우려

- 빈 참가자 배열의 반환값은 브리프에서 정의하지 않았다. 이 함수는 게임 상태가 적어도 한 명의 점수 객체를 전달한다는 전제에서 동작한다.
