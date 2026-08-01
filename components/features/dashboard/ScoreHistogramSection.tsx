import { cn } from "@/lib/cn";
import { Badge } from "@/components/ui/Badge";
import { ChartIcon, DocumentCheckIcon, TargetIcon } from "@/components/ui/icons";
import { DistributionBar, type DistributionBarItem } from "@/components/data/DistributionBar";
import { ScoreHistogramChart } from "@/components/data/ScoreHistogramChart";
import {
  SPLIT_CHART_COLUMN_CLASS,
  SPLIT_GRID_CLASS,
  SPLIT_LIST_COLUMN_CLASS,
} from "@/components/data/split-layout";
import { formatCount, formatNumber } from "@/lib/format";
import type { AsyncDataState } from "@/hooks/useAsyncData";
import type {
  ScoreHistogramBucketDto,
  ScoreHistogramResponseDto,
} from "@/types/api";
import { DashboardSection, deriveSectionState } from "./DashboardSection";
import { SectionStatStrip, type SectionStatItem } from "./SectionStatStrip";
import { ChartSectionSkeleton } from "./SectionSkeletons";

/**
 * ③ 점수 구간 분포 섹션 (design.md 4.22).
 *
 * 바로 위 등급 분포와 **같은 모집단을 등급 축이 아니라 점수 축으로** 본다.
 * 그래서 등급분포 카드와 의도적으로 동일한 2분할 문법(좌: 형태 / 우: 값)을 쓴다.
 */

/** 이 섹션의 앵커 id. 목차·앵커 링크가 참조한다. */
export const SCORE_HISTOGRAM_SECTION_ID = "score-histogram";

/**
 * 최다 인원 구간을 고른다. 동률이면 `bucketIndex` 가 작은 쪽(= 먼저 온 항목)을 유지한다.
 *
 * @param buckets 구간 목록(서버 정렬 순서)
 * @returns 최다 구간. 목록이 비었으면 null
 */
function findTopBucket(
  buckets: ScoreHistogramBucketDto[],
): ScoreHistogramBucketDto | null {
  let top: ScoreHistogramBucketDto | null = null;
  for (const bucket of buckets) {
    if (!top || bucket.count > top.count) top = bucket;
  }
  return top;
}

/**
 * 구간 1개를 가로 막대 리스트 행으로 변환한다 (design.md 4.22.2).
 *
 * 톤을 `accent` 로 **고정**한다 — "70~79점 구간"은 좋고 나쁨이 없는 중립 분류라
 * 등급 톤(success/warning/danger)을 칠하면 "이 구간은 나쁘다"는 없는 의미가 생긴다.
 *
 * @param bucket 구간
 * @param topBucketIndex 최다 구간의 인덱스(굵기 강조 대상)
 * @returns 막대 리스트 행 데이터
 */
function toBucketBarItem(
  bucket: ScoreHistogramBucketDto,
  topBucketIndex: number,
): DistributionBarItem {
  return {
    key: String(bucket.bucketIndex),
    label: (
      <Badge tone="neutral" className="min-w-touch justify-center whitespace-nowrap">
        {bucket.label}
      </Badge>
    ),
    fillRatio: bucket.percentage,
    valueText: `${formatCount(bucket.count)}명 (${formatNumber(bucket.percentage, 1)}%)`,
    tone: "accent",
    emphasized: bucket.bucketIndex === topBucketIndex,
  };
}

/**
 * 스트립 칩 3개를 만든다. 전부 응답 필드이거나 그 단순 집계다.
 * 만점·구간 폭은 클라이언트 상수가 아니라 **응답값**을 쓴다(spec.md 3.7 공통 전제).
 *
 * @param data 히스토그램 응답
 * @param topBucket 최다 구간
 * @returns 스트립 칩 목록
 */
function buildStatItems(
  data: ScoreHistogramResponseDto,
  topBucket: ScoreHistogramBucketDto,
): SectionStatItem[] {
  return [
    {
      key: "total",
      icon: <DocumentCheckIcon className="h-4 w-4" />,
      label: "집계 대상",
      value: `${formatCount(data.totalCount)}건`,
      tone: "neutral",
    },
    {
      key: "bucket-size",
      icon: <ChartIcon className="h-4 w-4" />,
      label: "구간 폭",
      value: `${formatCount(data.bucketSize)}점`,
      badge: <Badge tone="neutral">만점 {formatCount(data.totalScoreMax)}점</Badge>,
      tone: "neutral",
    },
    {
      key: "top-bucket",
      icon: <TargetIcon className="h-4 w-4" />,
      label: "최다 구간",
      value: topBucket.label,
      badge: (
        <Badge tone="accent">
          {formatCount(topBucket.count)}명 ({formatNumber(topBucket.percentage, 1)}%)
        </Badge>
      ),
      tone: "accent",
    },
  ];
}

interface ScoreHistogramSectionProps {
  query: AsyncDataState<ScoreHistogramResponseDto>;
}

/**
 * 점수 구간 분포 섹션.
 *
 * 빈 판정은 `totalCount === 0` 이다. `buckets.length === 0` 을 쓰지 않는 이유:
 * 서버는 인원 0명인 구간도 채워 보내므로 `buckets` 는 항상 있다.
 *
 * @param query 이 섹션 전용 조회 상태
 * @returns 섹션 카드
 */
export function ScoreHistogramSection({ query }: ScoreHistogramSectionProps) {
  const state = deriveSectionState(query, (data) => data.totalCount === 0);
  const data = query.data;
  const topBucket = data ? findTopBucket(data.buckets) : null;

  return (
    <DashboardSection
      id={SCORE_HISTOGRAM_SECTION_ID}
      title="점수 구간 분포"
      description="합계점수를 구간으로 나눠 몇 명이 어디에 몰려 있는지 봅니다."
      icon={<ChartIcon />}
      state={state}
      onRetry={query.refetch}
      emptyTitle="집계할 성적이 없습니다."
      emptyIcon={<ChartIcon className="h-6 w-6 md:h-8 md:w-8" />}
      skeleton={<ChartSectionSkeleton />}
      footnotes={[
        "인원이 0명인 구간도 생략하지 않고 표시합니다. 빈 구간이 사라지면 분포의 모양이 왜곡됩니다.",
      ]}
    >
      {data && topBucket ? (
        <>
          <SectionStatStrip items={buildStatItems(data, topBucket)} columns={3} />

          <div className={cn("mt-4", SPLIT_GRID_CLASS)}>
            {/* 절반 1 — 분포의 형태 */}
            <div className={SPLIT_CHART_COLUMN_CLASS}>
              <h4 className="sr-only">점수 구간별 인원수와 누적 비율 그래프</h4>
              <ScoreHistogramChart
                buckets={data.buckets}
                totalScoreMax={data.totalScoreMax}
              />
            </div>

            {/* 절반 2 — 구간별 정확한 수치. count === 0 인 구간도 행을 남긴다
                (행이 사라지면 히스토그램과 목록의 항목 수가 어긋난다). */}
            <div className={SPLIT_LIST_COLUMN_CLASS}>
              <h4 className="sr-only">점수 구간별 인원 목록</h4>
              <DistributionBar
                items={data.buckets.map((bucket) =>
                  toBucketBarItem(bucket, topBucket.bucketIndex),
                )}
              />
            </div>
          </div>
        </>
      ) : null}
    </DashboardSection>
  );
}
