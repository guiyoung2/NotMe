import { describe, expect, it } from 'vitest';

import sourceLicense from '../../../../LICENSES/lazygyu-roulette-MIT.txt?raw';
import distributedLicense from '../../../../public/licenses/lazygyu-roulette-MIT.txt?raw';
import sourceNotice from '../../../../THIRD_PARTY_NOTICES.md?raw';
import distributedNotice from '../../../../public/THIRD_PARTY_NOTICES.md?raw';

describe('마블 룰렛 배포 라이선스 자산', () => {
  it('배포용 MIT 전문은 권위 원본과 일치한다', () => {
    expect(distributedLicense).toBe(sourceLicense);
  });

  it('배포용 제3자 고지는 권위 원본과 일치한다', () => {
    expect(distributedNotice).toBe(sourceNotice);
  });
});
