import type { GradeDistributionItemDto } from "@/types/api";

/**
 * 등급 분포 요약 계산 (design.md 4.15 카드 헤더 배지).
 * 화면이 아니라 여기서 계산해 두면 헤더 배지와 리스트 강조가 같은 값을 본다.
 */

export interface GradeDistributionSummary {
  /** 전체 인원 합계 */
  totalCount: number;
  /**
   * 최다 인원 등급 항목. 동률이면 먼저 온 등급. 항목이 없으면 null.
   *
   * 등급 문자만이 아니라 항목 전체를 돌려주는 이유: 헤더 배지는 등급 문자(`최다 A+`)를,
   * 콤보 차트 헤드라인은 같은 등급의 비중(`34.2%`)을 쓰기 때문이다.
   * 한 번의 판정 결과를 두 곳이 나눠 써야 값이 갈라지지 않는다 (design.md 4.15.2).
   */
  topItem: GradeDistributionItemDto | null;
}

/**
 * 등급 분포 배열에서 총 인원과 최다 등급을 계산한다.
 * 서버가 주지 않는 값을 지어내지 않고, 주어진 items 만으로 도출한다.
 *
 * @param items 등급별 인원수/비율 목록
 * @returns 총 인원과 최다 등급 항목
 */
export function summarizeGradeDistribution(
  items: GradeDistributionItemDto[],
): GradeDistributionSummary {
  let totalCount = 0;
  let topItem: GradeDistributionItemDto | null = null;

  for (const item of items) {
    totalCount += item.count;
    // 동률일 때 먼저 온 등급을 유지하려면 "초과"일 때만 교체한다.
    if (!topItem || item.count > topItem.count) topItem = item;
  }

  return { totalCount, topItem };
}
