import { Skeleton } from "@/components/feedback/Skeleton";
import { SectionStatStripSkeleton } from "./SectionStatStrip";

/**
 * 섹션 본문 로딩 스켈레톤 2종 (design.md 5.1 "추가 규칙").
 *
 * 섹션 9개가 각자 다른 시각에 도착할 때 **화면이 계속 튀지 않게 하는 것**이 이 화면의 최대 모션
 * 과제다. 애니메이션을 더하는 대신 스켈레톤 높이를 실제 본문에 맞춰 높이 점프를 줄인다.
 */

interface TableSectionSkeletonProps {
  /** 예상 행 수. 랭킹 10 / 위험군 8 / 그 외 6 (실제 응답 크기에 가깝게 맞춘다) */
  rows?: number;
  /** 스트립 자리를 함께 그릴지. 스트립이 없는 섹션은 false */
  withStrip?: boolean;
}

/**
 * 표 섹션(④⑤⑥⑦⑨⑩)의 로딩 스켈레톤.
 *
 * @param rows 스켈레톤 행 수
 * @param withStrip 상단 지표 스트립 자리 포함 여부
 * @returns 스켈레톤 블록
 */
export function TableSectionSkeleton({
  rows = 6,
  withStrip = true,
}: TableSectionSkeletonProps) {
  return (
    <div className="space-y-4">
      {withStrip ? <SectionStatStripSkeleton /> : null}
      <div className="space-y-2">
        {/* 표 헤더 자리 */}
        <Skeleton className="h-8 w-full rounded-md" />
        {/* h-10 = 실제 표의 px-3 py-3 행 높이에 맞춘 값이다(높이 점프 최소화). */}
        {Array.from({ length: rows }).map((_, index) => (
          <Skeleton key={index} className="h-10 w-full rounded-md" />
        ))}
      </div>
    </div>
  );
}

/**
 * 차트 섹션(③⑧)의 로딩 스켈레톤.
 * 플롯 자리를 실제 차트와 같은 높이 토큰(`h-chart` / `md:h-chart-lg`)으로 잡는다.
 *
 * @returns 스켈레톤 블록
 */
export function ChartSectionSkeleton() {
  return (
    <div className="space-y-4">
      <SectionStatStripSkeleton />
      <div className="flex flex-col gap-3">
        <Skeleton className="h-chart w-full rounded-lg md:h-chart-lg" />
        {/* x축 라벨 자리 / 범례 자리 */}
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-40" />
      </div>
    </div>
  );
}
