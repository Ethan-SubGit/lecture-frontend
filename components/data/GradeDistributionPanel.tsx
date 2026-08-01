import type { ReactNode } from "react";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ChartIcon } from "@/components/ui/icons";
import { GradeBadge, getGradeTone } from "@/components/ui/GradeBadge";
import { Skeleton } from "@/components/feedback/Skeleton";
import { DistributionBar, type DistributionBarItem } from "./DistributionBar";
import { GradeComboChart } from "./GradeComboChart";
import {
  SPLIT_CHART_COLUMN_CLASS,
  SPLIT_GRID_CLASS,
  SPLIT_LIST_COLUMN_CLASS,
} from "./split-layout";
import { summarizeGradeDistribution } from "@/lib/distribution";
import { formatCount, formatNumber } from "@/lib/format";
import type { GradeDistributionItemDto } from "@/types/api";

/** 로딩 시 막대 리스트 자리에 채울 행 수. 실제 등급 수와 비슷한 값이면 레이아웃이 덜 튄다. */
const SKELETON_ROW_COUNT = 5;

interface GradeDistributionPanelProps {
  /** `DashboardSummaryDto.gradeDistribution` 원본. 가공해서 넘기지 않는다 */
  items: GradeDistributionItemDto[];
  /** 최초 조회 중이면 true. 2분할 골격을 유지한 채 스켈레톤을 채운다 */
  isLoading?: boolean;
}

/**
 * 등급분포 카드 (design.md 4.15) — 콤보 차트 + 막대 리스트 2분할.
 *
 * **빈/로딩 상태의 단일 판정자**다. 두 자식(`GradeComboChart`, `DistributionBar`)은
 * 자기 빈 상태를 갖지 않는다 — 반쪽마다 빈 상태가 나오면 화면이 망가지기 때문이다.
 * `totalCount === 0`(항목은 있는데 인원이 전부 0)도 빈 상태로 본다: 차트는 막대가 전부 0,
 * 목록도 전부 0% 라 읽을 것이 없는 화면이 된다.
 *
 * @param items 등급별 인원수/비율 목록
 * @param isLoading 최초 조회 중 여부
 * @returns 등급분포 카드
 */
export function GradeDistributionPanel({ items, isLoading = false }: GradeDistributionPanelProps) {
  // 로딩 중에는 아직 계산할 값이 없다. 헤더 배지 자리까지 스켈레톤으로 잡아 레이아웃을 고정한다.
  if (isLoading) {
    return (
      <DistributionCard action={<SummaryBadgesSkeleton />}>
        <DistributionSkeleton />
      </DistributionCard>
    );
  }

  const { totalCount, topItem } = summarizeGradeDistribution(items);

  // topItem 이 없으면 items 가 비었다는 뜻이고, totalCount 가 0 이면 전 등급이 0명이다.
  // 둘 다 "보여줄 분포가 없는" 상태이므로 2분할을 렌더하지 않고 빈 상태 1개만 둔다(헤더 배지도 생략).
  if (!topItem || totalCount === 0) {
    return (
      <DistributionCard>
        <DistributionEmptyState />
      </DistributionCard>
    );
  }

  return (
    <DistributionCard
      action={
        <span className="flex flex-wrap items-center gap-2">
          <Badge tone="neutral">총 {formatCount(totalCount)}명</Badge>
          <Badge tone="accent">최다 {topItem.grade}</Badge>
        </span>
      }
    >
      <div className={SPLIT_GRID_CLASS}>
        {/* 절반 1 — 분포의 "형태". 카드 헤더가 공통 제목이므로 소제목은 sr-only 로만 둔다. */}
        <div className={SPLIT_CHART_COLUMN_CLASS}>
          <h4 className="sr-only">등급별 인원수와 비율 그래프</h4>
          {/* 최다 등급 판정을 차트가 다시 하지 않도록 여기서 계산한 결과를 그대로 내려준다. */}
          <GradeComboChart items={items} topGrade={topItem} />
        </div>

        {/* 절반 2 — 등급별 정확한 수치.
            일반화된 DistributionBar 가 등급 타입을 모르므로 라벨·톤·수치 매핑은 여기서 한다
            (design.md 4.15.1 호출부 매핑 표). 최다 등급 강조도 같은 topItem 판정을 재사용한다. */}
        <div className={SPLIT_LIST_COLUMN_CLASS}>
          <h4 className="sr-only">등급별 인원 목록</h4>
          <DistributionBar items={items.map((item) => toGradeBarItem(item, topItem.grade))} />
        </div>
      </div>
    </DistributionCard>
  );
}

/**
 * 등급 분포 항목 1개를 가로 막대 리스트 행으로 변환한다 (design.md 4.15.1 매핑 표).
 *
 * 막대 색을 `GradeBadge` 와 **같은 `getGradeTone`** 으로 정하므로 배지와 막대의 색이
 * 한 등급도 어긋날 수 없다. 여기서 warning/danger 를 쓰는 것은 정당하다 —
 * **등급 자체가 이미 평가 결과**이기 때문이다(중립 분류인 점수 구간과의 차이).
 *
 * @param item 등급별 인원수/비율
 * @param topGrade 최다 등급 문자(굵기 강조 대상)
 * @returns 막대 리스트 행 데이터
 */
function toGradeBarItem(
  item: GradeDistributionItemDto,
  topGrade: string,
): DistributionBarItem {
  return {
    key: item.grade,
    label: <GradeBadge grade={item.grade} />,
    fillRatio: item.percentage,
    valueText: `${formatCount(item.count)}명 (${formatNumber(item.percentage, 1)}%)`,
    tone: getGradeTone(item.grade),
    emphasized: item.grade === topGrade,
  };
}

interface DistributionCardProps {
  /** 헤더 우측 요약 배지 영역. 빈 상태에서는 넘기지 않는다 */
  action?: ReactNode;
  children: ReactNode;
}

/**
 * 등급분포 카드 껍데기. 세 상태(정상·로딩·빈)가 같은 카드/헤더를 쓰도록 한 곳에 모았다.
 * 2분할이 되어도 카드는 여전히 1장이다(반쪽마다 카드를 만들면 raised 계층이 무너진다).
 *
 * @param action 헤더 우측 노드
 * @param children 카드 본문
 * @returns 카드 요소
 */
function DistributionCard({ action, children }: DistributionCardProps) {
  return (
    <Card elevation="raised">
      {/* as="h3": 대시보드가 그룹 제목(h2) 아래 계층이 되었다 (design.md 1.3.2 / 6.7.1). */}
      <CardHeader
        as="h3"
        title="등급 분포"
        action={action}
        className="flex-wrap md:flex-nowrap"
      />
      {children}
    </Card>
  );
}

/**
 * 등급 데이터가 한 건도 없을 때의 빈 상태 (design.md 4.15.0).
 * 텍스트만 두지 않는다 — 아이콘 자리 + 설명 + 다음 행동으로 가는 액션 3종을 갖춘다.
 *
 * 원래 `DistributionBar` 안에 있던 `EmptyDistribution` 을 카드 단위로 끌어올린 것이다.
 *
 * @returns 빈 상태 블록
 */
export function DistributionEmptyState() {
  return (
    <div className="flex flex-col items-center gap-2 py-10 text-center">
      <span
        aria-hidden="true"
        className="grid h-12 w-12 place-items-center rounded-full bg-surface-sunken text-muted"
      >
        <ChartIcon className="h-6 w-6" />
      </span>
      <p className="text-body font-medium text-secondary">아직 등급 데이터가 없습니다</p>
      <p className="text-caption text-muted">성적을 업로드하면 등급 분포가 표시됩니다.</p>
      <Button variant="secondary" size="sm" href="/scores/upload" className="mt-2">
        성적 업로드하러 가기
      </Button>
    </div>
  );
}

/** 헤더 요약 배지 2개 자리의 스켈레톤. */
function SummaryBadgesSkeleton() {
  return (
    <span className="flex flex-wrap items-center gap-2">
      {/* 실제 Badge 와 같은 모서리(rounded-sm)를 써서 로딩 → 완료 전환이 덜 튀게 한다. */}
      <Skeleton className="h-6 w-20 rounded-sm" />
      <Skeleton className="h-6 w-20 rounded-sm" />
    </span>
  );
}

/**
 * 로딩 스켈레톤 (design.md 4.15.0 loading).
 * 2분할 그리드를 그대로 유지한 채 양쪽을 채운다 — 로딩이 끝났을 때 레이아웃이 튀지 않게 하기 위함이다.
 *
 * @returns 스켈레톤 2분할 블록
 */
function DistributionSkeleton() {
  return (
    <div aria-busy="true" className={SPLIT_GRID_CLASS}>
      <span className="sr-only">불러오는 중</span>

      {/* 좌: 헤드라인 / 플롯 / x축 라벨 / 범례 4단 */}
      <div className={SPLIT_CHART_COLUMN_CLASS}>
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-chart w-full rounded-lg md:h-chart-lg" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-40" />
      </div>

      {/* 우: 실제 행과 같은 배지 + 막대 구조 */}
      <div className={SPLIT_LIST_COLUMN_CLASS}>
        <ul className="space-y-1">
          {Array.from({ length: SKELETON_ROW_COUNT }).map((_, index) => (
            <li key={index} className="flex items-center gap-3 px-2 py-2">
              <Skeleton className="h-6 min-w-touch shrink-0 rounded-sm" />
              <Skeleton className="h-2 w-full rounded-full" />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
